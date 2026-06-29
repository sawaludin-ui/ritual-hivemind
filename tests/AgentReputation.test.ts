import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { parseEther } from "viem";
import { deployHivemind, type HivemindFixture } from "./helpers.js";

/**
 * AgentReputation — reputation ledger, weighted bounty splits, leaderboard.
 * Covers spec section 2 (AgentReputation.sol) + access control + reentrancy-adjacent
 * payout math. The contract is the single source of truth for rep/earnings.
 */
describe("AgentReputation", () => {
  let f: HivemindFixture;

  beforeEach(async () => {
    f = await deployHivemind();
  });

  // Helper: authorize the deployer as a direct caller so we can unit-test
  // updateReputation / distributeBounty without going through SwarmExecution.
  async function authorizeDeployer() {
    await f.reputation.write.setAuthorizedCaller([
      f.deployer.account.address,
      true,
    ]);
  }

  // ---------------------------------------------------------------- updateReputation
  describe("updateReputation", () => {
    it("increases reputation on positive delta", async () => {
      await authorizeDeployer();
      await f.reputation.write.updateReputation([f.alice.account.address, 50n]);
      // First touch initializes to 100, then +50 = 150.
      assert.equal(
        await f.reputation.read.getReputation([f.alice.account.address]),
        150n,
      );
    });

    it("decreases reputation on negative delta", async () => {
      await authorizeDeployer();
      await f.reputation.write.updateReputation([f.alice.account.address, 0n]); // init 100
      await f.reputation.write.updateReputation([f.alice.account.address, -30n]);
      assert.equal(
        await f.reputation.read.getReputation([f.alice.account.address]),
        70n,
      );
    });

    it("never underflows below zero", async () => {
      await authorizeDeployer();
      await f.reputation.write.updateReputation([f.alice.account.address, 0n]); // init 100
      await f.reputation.write.updateReputation([f.alice.account.address, -9999n]);
      assert.equal(
        await f.reputation.read.getReputation([f.alice.account.address]),
        0n,
      );
    });

    it("reverts if called by unauthorized account", async () => {
      await f.viem.assertions.revertWithCustomError(
        f.reputation.write.updateReputation([f.alice.account.address, 10n], {
          account: f.bob.account,
        }),
        f.reputation,
        "NotAuthorizedCaller",
      );
    });

    it("emits ReputationUpdated with new total", async () => {
      await authorizeDeployer();
      const tx = await f.reputation.write.updateReputation([
        f.alice.account.address,
        25n,
      ]);
      await f.viem.assertions.emitWithArgs(tx, f.reputation, "ReputationUpdated", [
        f.alice.account.address,
        25n,
        125n,
      ]);
    });
  });

  // ---------------------------------------------------------------- distributeBounty
  describe("distributeBounty", () => {
    it("splits bounty proportionally by weight", async () => {
      await authorizeDeployer();
      const total = parseEther("3");
      // weights 1:2 -> payouts 1 ETH : 2 ETH
      const result = await f.reputation.simulate.distributeBounty([
        1n,
        [f.alice.account.address, f.bob.account.address],
        [1n, 2n],
        total,
      ]);
      const payouts = result.result as bigint[];
      assert.equal(payouts[0], parseEther("1"));
      assert.equal(payouts[1], parseEther("2"));
    });

    it("distributes exactly the full bounty with no dust loss", async () => {
      await authorizeDeployer();
      // 10 wei split 3 ways equally -> 3,3,4 (last gets remainder)
      const total = 10n;
      const result = await f.reputation.simulate.distributeBounty([
        1n,
        [
          f.alice.account.address,
          f.bob.account.address,
          f.carol.account.address,
        ],
        [1n, 1n, 1n],
        total,
      ]);
      const payouts = result.result as bigint[];
      const sum = payouts.reduce((a, b) => a + b, 0n);
      assert.equal(sum, total);
      assert.equal(payouts[2], 4n); // last absorbs remainder
    });

    it("updates totalEarned and tasksCompleted", async () => {
      await authorizeDeployer();
      await f.reputation.write.distributeBounty([
        1n,
        [f.alice.account.address],
        [1n],
        parseEther("5"),
      ]);
      const totals = await f.reputation.read.getAgentTotals([
        f.alice.account.address,
      ]);
      assert.equal(totals[2], parseEther("5")); // totalEarned
      assert.equal(totals[1], 1n); // tasksCompleted
    });

    it("reverts on length mismatch", async () => {
      await authorizeDeployer();
      await f.viem.assertions.revertWithCustomError(
        f.reputation.write.distributeBounty([
          1n,
          [f.alice.account.address, f.bob.account.address],
          [1n],
          parseEther("1"),
        ]),
        f.reputation,
        "LengthMismatch",
      );
    });

    it("reverts on empty contributors", async () => {
      await authorizeDeployer();
      await f.viem.assertions.revertWithCustomError(
        f.reputation.write.distributeBounty([1n, [], [], parseEther("1")]),
        f.reputation,
        "ZeroWeights",
      );
    });

    it("reverts when total weight is zero", async () => {
      await authorizeDeployer();
      await f.viem.assertions.revertWithCustomError(
        f.reputation.write.distributeBounty([
          1n,
          [f.alice.account.address],
          [0n],
          parseEther("1"),
        ]),
        f.reputation,
        "ZeroWeights",
      );
    });

    it("reverts if called by unauthorized", async () => {
      await f.viem.assertions.revertWithCustomError(
        f.reputation.write.distributeBounty(
          [1n, [f.alice.account.address], [1n], parseEther("1")],
          { account: f.bob.account },
        ),
        f.reputation,
        "NotAuthorizedCaller",
      );
    });
  });

  // ---------------------------------------------------------------- getLeaderboard
  describe("getLeaderboard", () => {
    it("returns agents sorted by reputation descending", async () => {
      await authorizeDeployer();
      await f.reputation.write.updateReputation([f.alice.account.address, 50n]); // 150
      await f.reputation.write.updateReputation([f.bob.account.address, 200n]); // 300
      await f.reputation.write.updateReputation([f.carol.account.address, 0n]); // 100

      const [agents, reps] = await f.reputation.read.getLeaderboard([10n]);
      assert.equal(agents.length, 3);
      assert.equal(agents[0].toLowerCase(), f.bob.account.address.toLowerCase());
      assert.equal(reps[0], 300n);
      assert.equal(reps[1], 150n);
      assert.equal(reps[2], 100n);
    });

    it("respects the limit parameter", async () => {
      await authorizeDeployer();
      await f.reputation.write.updateReputation([f.alice.account.address, 10n]);
      await f.reputation.write.updateReputation([f.bob.account.address, 20n]);
      await f.reputation.write.updateReputation([f.carol.account.address, 30n]);

      const [agents] = await f.reputation.read.getLeaderboard([2n]);
      assert.equal(agents.length, 2);
    });
  });

  // ---------------------------------------------------------------- access control
  describe("access control", () => {
    it("blocks setAuthorizedCaller from non-owner", async () => {
      await f.viem.assertions.revertWithCustomError(
        f.reputation.write.setAuthorizedCaller(
          [f.bob.account.address, true],
          { account: f.bob.account },
        ),
        f.reputation,
        "NotOwner",
      );
    });
  });
});
