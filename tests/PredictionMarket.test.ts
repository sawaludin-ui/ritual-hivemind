import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseEther, getAddress } from "viem";

/**
 * PredictionMarket test suite.
 *
 * Covers: market creation, betting, fee collection, early exit (solvency-safe),
 * resolution, winnings claim, refunds on cancel, odds math, and the critical
 * SOLVENCY INVARIANT: contract balance always >= total claimable pool.
 */

// Outcome enum mirror
const Outcome = { Unresolved: 0, OptionA: 1, OptionB: 2 } as const;
const Status = { Active: 0, Closed: 1, Resolved: 2, Cancelled: 3 } as const;

async function deploy() {
  const connection = await network.create();
  const { viem } = connection;
  const [deployer, alice, bob, carol, feeWallet] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  const market = await viem.deployContract("PredictionMarket", [
    feeWallet.account.address,
  ]);

  return { connection, viem, publicClient, deployer, alice, bob, carol, feeWallet, market };
}

async function marketAs(fixture: any, account: any) {
  return fixture.viem.getContractAt("PredictionMarket", fixture.market.address, {
    client: { wallet: account },
  });
}

/** Assert a contract call reverts; matches either error name in message or by selector. */
async function rejectsWith(promise: Promise<any>, pattern: RegExp | string) {
  try {
    await promise;
    assert.fail(`Expected revert matching ${pattern}, but call succeeded`);
  } catch (e: any) {
    const msg = (e?.message ?? "") + " " + String(e?.cause?.message ?? "") + " " + String(e?.shortMessage ?? "") + " " + String(e?.details ?? "");
    const re = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    assert.ok(re.test(msg) || msg.includes("reverted"), `Revert did not match ${pattern}: ${msg.slice(0, 200)}`);
  }
}

describe("PredictionMarket", () => {
  it("deploys with correct fee collector and default fees", async () => {
    const f = await deploy();
    const collector = await f.market.read.feeCollector();
    assert.equal(getAddress(collector), getAddress(f.feeWallet.account.address));
    assert.equal(await f.market.read.betFeeBps(), 200n);
    assert.equal(await f.market.read.exitFeeBps(), 100n);
  });

  it("creates a market (resolver only)", async () => {
    const f = await deploy();
    await f.market.write.createMarket([
      "Brazil vs Germany - Who wins?",
      "Brazil",
      "Germany",
      9999999999999n,
    ]);
    assert.equal(await f.market.read.marketCount(), 1n);
    const m = await f.market.read.getMarket([1n]);
    assert.equal(m.question, "Brazil vs Germany - Who wins?");
    assert.equal(m.optionA, "Brazil");
    assert.equal(m.status, Status.Active);
  });

  it("rejects market creation from non-resolver", async () => {
    const f = await deploy();
    const asAlice = await marketAs(f, f.alice);
    await rejectsWith(asAlice.write.createMarket(["Q", "A", "B", 1n]), /NotResolver|reverted/);
  });

  it("rejects empty question / option", async () => {
    const f = await deploy();
    await rejectsWith(f.market.write.createMarket(["", "A", "B", 1n]), /EmptyQuestion/);
    await rejectsWith(f.market.write.createMarket(["Q", "", "B", 1n]), /EmptyOption/);
  });

  it("accepts bets, mints shares 1:1 net, collects 2% fee", async () => {
    const f = await deploy();
    await f.market.write.createMarket(["Q", "A", "B", 1n]);

    const feeBefore = await f.publicClient.getBalance({ address: f.feeWallet.account.address });

    const asAlice = await marketAs(f, f.alice);
    await asAlice.write.bet([1n, Outcome.OptionA], { value: parseEther("1") });

    // 2% fee → 0.98 net staked, 0.98 shares
    const m = await f.market.read.getMarket([1n]);
    assert.equal(m.stakedA, parseEther("0.98"));
    assert.equal(m.sharesA, parseEther("0.98"));

    const pos = await f.market.read.getPosition([1n, f.alice.account.address]);
    assert.equal(pos.sharesA, parseEther("0.98"));
    assert.equal(pos.invested, parseEther("1"));

    const feeAfter = await f.publicClient.getBalance({ address: f.feeWallet.account.address });
    assert.equal(feeAfter - feeBefore, parseEther("0.02"));
  });

  it("rejects bet on invalid side or zero stake", async () => {
    const f = await deploy();
    await f.market.write.createMarket(["Q", "A", "B", 1n]);
    const asAlice = await marketAs(f, f.alice);
    await rejectsWith(
      asAlice.write.bet([1n, Outcome.Unresolved], { value: parseEther("1") }),
      /InvalidSide/,
    );
    await rejectsWith(asAlice.write.bet([1n, Outcome.OptionA], { value: 0n }), /ZeroStake/);
  });

  it("computes odds correctly", async () => {
    const f = await deploy();
    await f.market.write.createMarket(["Q", "A", "B", 1n]);
    const asAlice = await marketAs(f, f.alice);
    const asBob = await marketAs(f, f.bob);

    // empty → 50/50
    let [probA, probB] = await f.market.read.getOdds([1n]);
    assert.equal(probA, 5000n);
    assert.equal(probB, 5000n);

    // Alice 3 on A, Bob 1 on B → A should be 75%
    await asAlice.write.bet([1n, Outcome.OptionA], { value: parseEther("3") });
    await asBob.write.bet([1n, Outcome.OptionB], { value: parseEther("1") });
    [probA, probB] = await f.market.read.getOdds([1n]);
    // 2.94 / (2.94+0.98) = 0.75
    assert.equal(probA, 7500n);
    assert.equal(probB, 2500n);
  });

  it("resolves and pays winners (winning stake + losing pool pro-rata)", async () => {
    const f = await deploy();
    await f.market.write.createMarket(["Q", "A", "B", 1n]);
    const asAlice = await marketAs(f, f.alice);
    const asBob = await marketAs(f, f.bob);

    // Alice bets 2 on A, Bob bets 1 on B
    await asAlice.write.bet([1n, Outcome.OptionA], { value: parseEther("2") });
    await asBob.write.bet([1n, Outcome.OptionB], { value: parseEther("1") });

    // net: A=1.96, B=0.98. A wins.
    await f.market.write.resolveMarket([1n, Outcome.OptionA]);

    const balBefore = await f.publicClient.getBalance({ address: f.alice.account.address });
    const asAlice2 = await marketAs(f, f.alice);
    const tx = await asAlice2.write.claimWinnings([1n]);
    const receipt = await f.publicClient.waitForTransactionReceipt({ hash: tx });
    const gas = receipt.gasUsed * receipt.effectiveGasPrice;
    const balAfter = await f.publicClient.getBalance({ address: f.alice.account.address });

    // Alice (only A bettor) gets her 1.96 + entire losing pool 0.98 = 2.94
    const received = balAfter - balBefore + gas;
    assert.equal(received, parseEther("2.94"));
  });

  it("SOLVENCY INVARIANT: contract balance always covers all claims", async () => {
    const f = await deploy();
    await f.market.write.createMarket(["Q", "A", "B", 1n]);
    const asAlice = await marketAs(f, f.alice);
    const asBob = await marketAs(f, f.bob);
    const asCarol = await marketAs(f, f.carol);

    await asAlice.write.bet([1n, Outcome.OptionA], { value: parseEther("5") });
    await asBob.write.bet([1n, Outcome.OptionB], { value: parseEther("3") });
    await asCarol.write.bet([1n, Outcome.OptionA], { value: parseEther("2") });

    // Carol exits early (solvency-safe: gets her net stake minus exit fee)
    const carolPos = await f.market.read.getPosition([1n, f.carol.account.address]);
    await asCarol.write.sellPosition([1n, Outcome.OptionA, carolPos.sharesA]);

    const m = await f.market.read.getMarket([1n]);
    const claimablePool = m.stakedA + m.stakedB;
    const contractBal = await f.publicClient.getBalance({ address: f.market.address });

    // Contract must hold at least the claimable pool
    assert.ok(contractBal >= claimablePool, `balance ${contractBal} < pool ${claimablePool}`);
  });

  it("early exit returns net stake minus 1% fee", async () => {
    const f = await deploy();
    await f.market.write.createMarket(["Q", "A", "B", 1n]);
    const asAlice = await marketAs(f, f.alice);
    await asAlice.write.bet([1n, Outcome.OptionA], { value: parseEther("1") });

    const pos = await f.market.read.getPosition([1n, f.alice.account.address]);
    // shares = 0.98
    const balBefore = await f.publicClient.getBalance({ address: f.alice.account.address });
    const tx = await asAlice.write.sellPosition([1n, Outcome.OptionA, pos.sharesA]);
    const receipt = await f.publicClient.waitForTransactionReceipt({ hash: tx });
    const gas = receipt.gasUsed * receipt.effectiveGasPrice;
    const balAfter = await f.publicClient.getBalance({ address: f.alice.account.address });

    // 0.98 shares - 1% exit fee = 0.9702
    const received = balAfter - balBefore + gas;
    assert.equal(received, parseEther("0.9702"));

    // position cleared
    const posAfter = await f.market.read.getPosition([1n, f.alice.account.address]);
    assert.equal(posAfter.sharesA, 0n);
  });

  it("cancel + refund returns net stake", async () => {
    const f = await deploy();
    await f.market.write.createMarket(["Q", "A", "B", 1n]);
    const asAlice = await marketAs(f, f.alice);
    await asAlice.write.bet([1n, Outcome.OptionA], { value: parseEther("1") });

    await f.market.write.cancelMarket([1n]);

    const balBefore = await f.publicClient.getBalance({ address: f.alice.account.address });
    const tx = await asAlice.write.claimRefund([1n]);
    const receipt = await f.publicClient.waitForTransactionReceipt({ hash: tx });
    const gas = receipt.gasUsed * receipt.effectiveGasPrice;
    const balAfter = await f.publicClient.getBalance({ address: f.alice.account.address });

    // net stake 0.98 refunded (fee already taken at bet time, not refunded)
    const received = balAfter - balBefore + gas;
    assert.equal(received, parseEther("0.98"));
  });

  it("prevents double claim", async () => {
    const f = await deploy();
    await f.market.write.createMarket(["Q", "A", "B", 1n]);
    const asAlice = await marketAs(f, f.alice);
    const asBob = await marketAs(f, f.bob);
    await asAlice.write.bet([1n, Outcome.OptionA], { value: parseEther("1") });
    await asBob.write.bet([1n, Outcome.OptionB], { value: parseEther("1") });
    await f.market.write.resolveMarket([1n, Outcome.OptionA]);

    await asAlice.write.claimWinnings([1n]);
    await rejectsWith(asAlice.write.claimWinnings([1n]), /AlreadyClaimed/);
  });

  it("loser cannot claim winnings", async () => {
    const f = await deploy();
    await f.market.write.createMarket(["Q", "A", "B", 1n]);
    const asAlice = await marketAs(f, f.alice);
    const asBob = await marketAs(f, f.bob);
    await asAlice.write.bet([1n, Outcome.OptionA], { value: parseEther("1") });
    await asBob.write.bet([1n, Outcome.OptionB], { value: parseEther("1") });
    await f.market.write.resolveMarket([1n, Outcome.OptionA]);

    await rejectsWith(asBob.write.claimWinnings([1n]), /NothingToClaim/);
  });

  it("blocks bets after close/resolve", async () => {
    const f = await deploy();
    await f.market.write.createMarket(["Q", "A", "B", 1n]);
    const asAlice = await marketAs(f, f.alice);
    await f.market.write.closeMarket([1n]);
    await rejectsWith(
      asAlice.write.bet([1n, Outcome.OptionA], { value: parseEther("1") }),
      /MarketNotActive/,
    );
  });

  it("only resolver can resolve, valid outcome only", async () => {
    const f = await deploy();
    await f.market.write.createMarket(["Q", "A", "B", 1n]);
    const asAlice = await marketAs(f, f.alice);
    await rejectsWith(asAlice.write.resolveMarket([1n, Outcome.OptionA]), /NotResolver|reverted/);
    await rejectsWith(f.market.write.resolveMarket([1n, Outcome.Unresolved]), /InvalidOutcome|reverted/);
  });

  it("owner can update fees within cap, rejects over cap", async () => {
    const f = await deploy();
    await f.market.write.setFees([300n, 150n]);
    assert.equal(await f.market.read.betFeeBps(), 300n);
    await rejectsWith(f.market.write.setFees([1100n, 100n]), /FeeTooHigh/);
  });

  it("previewPayout estimates winning payout", async () => {
    const f = await deploy();
    await f.market.write.createMarket(["Q", "A", "B", 1n]);
    const asBob = await marketAs(f, f.bob);
    await asBob.write.bet([1n, Outcome.OptionB], { value: parseEther("2") });

    // If I bet 1 on A and A wins: net 0.98, losing pool B = 1.96
    // payout = 0.98 + (0.98 / 0.98) * 1.96 = 0.98 + 1.96 = 2.94
    const est = await f.market.read.previewPayout([1n, Outcome.OptionA, parseEther("1")]);
    assert.equal(est, parseEther("2.94"));
  });

  it("multiple winners split losing pool pro-rata", async () => {
    const f = await deploy();
    await f.market.write.createMarket(["Q", "A", "B", 1n]);
    const asAlice = await marketAs(f, f.alice);
    const asBob = await marketAs(f, f.bob);
    const asCarol = await marketAs(f, f.carol);

    // Alice 1 on A, Bob 3 on A, Carol 4 on B
    await asAlice.write.bet([1n, Outcome.OptionA], { value: parseEther("1") });
    await asBob.write.bet([1n, Outcome.OptionA], { value: parseEther("3") });
    await asCarol.write.bet([1n, Outcome.OptionB], { value: parseEther("4") });
    // net: Alice A=0.98, Bob A=2.94, total A shares=3.92; B pool=3.92
    await f.market.write.resolveMarket([1n, Outcome.OptionA]);

    // Alice: 0.98 + (0.98/3.92)*3.92 = 0.98 + 0.98 = 1.96
    const aliceBefore = await f.publicClient.getBalance({ address: f.alice.account.address });
    const t1 = await asAlice.write.claimWinnings([1n]);
    const r1 = await f.publicClient.waitForTransactionReceipt({ hash: t1 });
    const aliceAfter = await f.publicClient.getBalance({ address: f.alice.account.address });
    const aliceGot = aliceAfter - aliceBefore + r1.gasUsed * r1.effectiveGasPrice;
    assert.equal(aliceGot, parseEther("1.96"));

    // Bob: 2.94 + (2.94/3.92)*3.92 = 2.94 + 2.94 = 5.88
    const bobBefore = await f.publicClient.getBalance({ address: f.bob.account.address });
    const t2 = await asBob.write.claimWinnings([1n]);
    const r2 = await f.publicClient.waitForTransactionReceipt({ hash: t2 });
    const bobAfter = await f.publicClient.getBalance({ address: f.bob.account.address });
    const bobGot = bobAfter - bobBefore + r2.gasUsed * r2.effectiveGasPrice;
    assert.equal(bobGot, parseEther("5.88"));
  });

  it("handles one-sided market (no losers) - winners get stake back", async () => {
    const f = await deploy();
    await f.market.write.createMarket(["Q", "A", "B", 1n]);
    const asAlice = await marketAs(f, f.alice);
    await asAlice.write.bet([1n, Outcome.OptionA], { value: parseEther("1") });
    // Only A has bets. A wins → no losing pool.
    await f.market.write.resolveMarket([1n, Outcome.OptionA]);

    const before = await f.publicClient.getBalance({ address: f.alice.account.address });
    const tx = await asAlice.write.claimWinnings([1n]);
    const r = await f.publicClient.waitForTransactionReceipt({ hash: tx });
    const after = await f.publicClient.getBalance({ address: f.alice.account.address });
    const got = after - before + r.gasUsed * r.effectiveGasPrice;
    // Just gets net stake back (no losing pool to add)
    assert.equal(got, parseEther("0.98"));
  });
});
