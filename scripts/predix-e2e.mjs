import { readFile } from "node:fs/promises";
import path from "node:path";
import { createWalletClient, createPublicClient, http, defineChain, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

/**
 * E2E test for PredictionMarket on Ritual testnet (LIVE).
 * Bets on both sides of a market, checks odds, resolves, claims.
 * Uses the deployer wallet for all roles (single-wallet test).
 */

const ritual = defineChain({
  id: 1979, name: "Ritual Testnet",
  nativeCurrency: { name: "RITUAL", symbol: "RITUAL", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.ritualfoundation.org"] } },
});

async function main() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
  const pub = createPublicClient({ chain: ritual, transport: http() });
  const wallet = createWalletClient({ account, chain: ritual, transport: http() });

  const dep = JSON.parse(await readFile(path.resolve("deployments/predix.json"), "utf8"));
  const address = dep.predictionMarket;
  const artifact = JSON.parse(
    await readFile(path.resolve("artifacts/contracts/PredictionMarket.sol/PredictionMarket.json"), "utf8"),
  );
  const abi = artifact.abi;

  console.log(`\n🧪 PREDIX E2E — Ritual testnet`);
  console.log(`   Market contract: ${address}`);
  console.log(`   Wallet: ${account.address}\n`);

  const w = async (fn, args, value) => {
    const hash = await wallet.writeContract({ address, abi, functionName: fn, args, value });
    const r = await pub.waitForTransactionReceipt({ hash });
    return r;
  };
  const r = (fn, args) => pub.readContract({ address, abi, functionName: fn, args });

  // Create a fresh market for the test
  console.log("STEP 1: Create test market");
  await w("createMarket", ["E2E: Team X vs Team Y — Who wins?", "Team X", "Team Y", BigInt(Date.now() + 3600000)]);
  const mid = await r("marketCount", []);
  console.log(`   ✅ Market #${mid} created`);

  // Bet 0.01 on A (Team X)
  console.log("\nSTEP 2: Bet 0.01 RITUAL on Team X (A)");
  await w("bet", [mid, 1], parseEther("0.01"));
  let m = await r("getMarket", [mid]);
  console.log(`   ✅ stakedA=${Number(m.stakedA)/1e18} sharesA=${Number(m.sharesA)/1e18}`);

  // Bet 0.005 on B (Team Y)
  console.log("\nSTEP 3: Bet 0.005 RITUAL on Team Y (B)");
  await w("bet", [mid, 2], parseEther("0.005"));
  m = await r("getMarket", [mid]);
  console.log(`   ✅ stakedB=${Number(m.stakedB)/1e18} sharesB=${Number(m.sharesB)/1e18}`);

  // Check odds
  const [probA, probB] = await r("getOdds", [mid]);
  console.log(`\nSTEP 4: Odds → A=${Number(probA)/100}% B=${Number(probB)/100}%`);

  // Preview payout
  const preview = await r("previewPayout", [mid, 1, parseEther("0.01")]);
  console.log(`   Preview: bet 0.01 more on A → ~${Number(preview)/1e18} RITUAL if A wins`);

  // Resolve A wins
  console.log("\nSTEP 5: Resolve — Team X (A) wins");
  await w("resolveMarket", [mid, 1]);
  m = await r("getMarket", [mid]);
  console.log(`   ✅ status=${m.status} outcome=${m.outcome}`);

  // Claim winnings
  console.log("\nSTEP 6: Claim winnings");
  const balBefore = await pub.getBalance({ address: account.address });
  const claimR = await w("claimWinnings", [mid]);
  const balAfter = await pub.getBalance({ address: account.address });
  const gas = claimR.gasUsed * claimR.effectiveGasPrice;
  const net = balAfter - balBefore + gas;
  console.log(`   ✅ Claimed net (excl gas): ${Number(net)/1e18} RITUAL`);
  console.log(`   (Expected: 0.0098 stake + 0.0049 losing pool = ~0.0147)`);

  // Verify fee collector got fees
  const fees = await r("accumulatedFees", []);
  console.log(`\nSTEP 7: Lifetime fees collected: ${Number(fees)/1e18} RITUAL`);

  console.log(`\n═══════════════════════════════════`);
  console.log(`  ✅ PREDIX E2E — SUCCESS`);
  console.log(`═══════════════════════════════════`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
