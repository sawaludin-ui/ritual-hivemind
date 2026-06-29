import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { parseEther } from "viem";
import {
  deployHivemind,
  futureDeadline,
  VALID_ATTESTATION,
  EMPTY_ATTESTATION,
  type HivemindFixture,
} from "./helpers.js";

/**
 * SwarmExecution — answer submission, TEE verification, synthesis + payout.
 * Covers spec section 2 (SwarmExecution.sol) and the full integration journey.
 */
describe("SwarmExecution", () => {
  let f: HivemindFixture;
  let deadline: bigint;

  beforeEach(async () => {
    f = await deployHivemind();
    deadline = await futureDeadline(f);
    // Register three agents.
    await f.core.write.registerAgent(["Alice", ["math"]], {
      account: f.alice.account,
    });
    await f.core.write.registerAgent(["Bob", ["nlp"]], {
      account: f.bob.account,
    });
    await f.core.write.registerAgent(["Carol", ["code"]], {
      account: f.carol.account,
    });
  });

  /** Creates a task (min=1,max=3) funded with `bounty`, returns its id. */
  async function createTask(bounty = parseEther("3")) {
    await f.core.write.createTask(["What is 2+2?", 1, 3, deadline], {
      account: f.dave.account,
      value: bounty,
    });
    return await f.core.read.taskCount();
  }

  // ---------------------------------------------------------------- submitAnswer
  describe("submitAnswer", () => {
    it("stores a submission from a claiming agent", async () => {
      const id = await createTask();
      await f.core.write.claimTask([id], { account: f.alice.account });
      const tx = await f.swarm.write.submitAnswer(
        [id, "4", VALID_ATTESTATION],
        { account: f.alice.account },
      );
      await f.viem.assertions.emitWithArgs(tx, f.swarm, "AnswerSubmitted", [
        1n,
        id,
        f.alice.account.address,
      ]);

      const subs = await f.swarm.read.getSubmissions([id]);
      assert.equal(subs.length, 1);
      assert.equal(subs[0].answer, "4");
      assert.equal(subs[0].agent.toLowerCase(), f.alice.account.address.toLowerCase());
    });

    it("reverts if agent did not claim the task", async () => {
      const id = await createTask();
      await f.viem.assertions.revertWithCustomError(
        f.swarm.write.submitAnswer([id, "4", VALID_ATTESTATION], {
          account: f.alice.account,
        }),
        f.swarm,
        "AgentNotClaimed",
      );
    });

    it("reverts on double-submit", async () => {
      const id = await createTask();
      await f.core.write.claimTask([id], { account: f.alice.account });
      await f.swarm.write.submitAnswer([id, "4", VALID_ATTESTATION], {
        account: f.alice.account,
      });
      await f.viem.assertions.revertWithCustomError(
        f.swarm.write.submitAnswer([id, "four", VALID_ATTESTATION], {
          account: f.alice.account,
        }),
        f.swarm,
        "AlreadySubmitted",
      );
    });

    it("reverts on a non-existent task", async () => {
      await f.viem.assertions.revertWithCustomError(
        f.swarm.write.submitAnswer([999n, "x", VALID_ATTESTATION], {
          account: f.alice.account,
        }),
        f.swarm,
        "TaskNotFound",
      );
    });
  });

  // ---------------------------------------------------------------- verifySubmission
  describe("verifySubmission", () => {
    it("passes with a valid (non-empty) TEE attestation", async () => {
      const id = await createTask();
      await f.core.write.claimTask([id], { account: f.alice.account });
      await f.swarm.write.submitAnswer([id, "4", VALID_ATTESTATION], {
        account: f.alice.account,
      });
      const result = await f.swarm.simulate.verifySubmission([1n]);
      assert.equal(result.result, true);
    });

    it("fails with an empty attestation", async () => {
      const id = await createTask();
      await f.core.write.claimTask([id], { account: f.alice.account });
      await f.swarm.write.submitAnswer([id, "4", EMPTY_ATTESTATION], {
        account: f.alice.account,
      });
      const result = await f.swarm.simulate.verifySubmission([1n]);
      assert.equal(result.result, false);
    });

    it("reverts on unknown submission id", async () => {
      await f.viem.assertions.revertWithCustomError(
        f.swarm.simulate.verifySubmission([999n]),
        f.swarm,
        "SubmissionNotFound",
      );
    });
  });

  // ---------------------------------------------------------------- synthesize
  describe("synthesize", () => {
    it("reverts if not enough verified submissions (below minAgents)", async () => {
      // min=2 task, only 1 valid submission.
      await f.core.write.createTask(["Need two", 2, 2, deadline], {
        account: f.dave.account,
        value: parseEther("2"),
      });
      const id = await f.core.read.taskCount();
      await f.core.write.claimTask([id], { account: f.alice.account });
      await f.core.write.claimTask([id], { account: f.bob.account });
      await f.swarm.write.submitAnswer([id, "4", VALID_ATTESTATION], {
        account: f.alice.account,
      });
      // Bob submits an EMPTY attestation -> won't verify -> only 1 verified < min 2.
      await f.swarm.write.submitAnswer([id, "4", EMPTY_ATTESTATION], {
        account: f.bob.account,
      });
      await f.viem.assertions.revertWithCustomError(
        f.swarm.write.synthesize([id], { account: f.dave.account }),
        f.swarm,
        "NotEnoughVerifiedSubmissions",
      );
    });

    it("completes synthesis, distributes bounty, marks task Complete", async () => {
      const bounty = parseEther("2");
      await f.core.write.createTask(["Solve", 2, 2, deadline], {
        account: f.dave.account,
        value: bounty,
      });
      const id = await f.core.read.taskCount();

      await f.core.write.claimTask([id], { account: f.alice.account });
      await f.core.write.claimTask([id], { account: f.bob.account });
      await f.swarm.write.submitAnswer([id, "4", VALID_ATTESTATION], {
        account: f.alice.account,
      });
      await f.swarm.write.submitAnswer([id, "4", VALID_ATTESTATION], {
        account: f.bob.account,
      });

      const tx = await f.swarm.write.synthesize([id], {
        account: f.dave.account,
      });
      await f.viem.assertions.emit(tx, f.swarm, "SynthesisComplete");

      // Task should be Complete (status enum index 3).
      const task = await f.core.read.getTask([id]);
      assert.equal(task[7], 3);

      // Synthesis record stored.
      const synth = await f.swarm.read.getSynthesis([id]);
      assert.equal(synth.contributors.length, 2);
      assert.equal(synth.consensusScore, 100);

      // Both contributors earned half the bounty each.
      const aliceTotals = await f.reputation.read.getAgentTotals([
        f.alice.account.address,
      ]);
      assert.equal(aliceTotals[2], parseEther("1"));
    });

    it("rewards every verified contributor with +10 reputation", async () => {
      const bounty = parseEther("2");
      await f.core.write.createTask(["Solve", 2, 2, deadline], {
        account: f.dave.account,
        value: bounty,
      });
      const id = await f.core.read.taskCount();

      await f.core.write.claimTask([id], { account: f.alice.account });
      await f.core.write.claimTask([id], { account: f.bob.account });
      await f.swarm.write.submitAnswer([id, "4", VALID_ATTESTATION], {
        account: f.alice.account,
      });
      await f.swarm.write.submitAnswer([id, "4", VALID_ATTESTATION], {
        account: f.bob.account,
      });

      await f.swarm.write.synthesize([id], { account: f.dave.account });

      // Both verified contributors rewarded (+10): 100 -> 110.
      assert.equal(
        await f.reputation.read.getReputation([f.alice.account.address]),
        110n,
      );
      assert.equal(
        await f.reputation.read.getReputation([f.bob.account.address]),
        110n,
      );
    });

    // KNOWN DESIGN ISSUE (flagged to Dimas 2026-06-29):
    // The non-submitter penalty loop in synthesize() is currently UNREACHABLE.
    // synthesize() reverts with NotEnoughVerifiedSubmissions whenever
    // verifiedCount < minAgents. Since a claimed-but-not-submitted agent reduces
    // verifiedCount below minAgents, synthesis can never run in that scenario,
    // so the `-1` penalty for claimed-non-submitters is dead code.
    // FIX OPTIONS: (a) decouple submission threshold from claim threshold, or
    // (b) drop minAgents check in favor of a dedicated minSubmissions param.
    // Skipping the penalty assertion until the design is resolved.
    it.skip("penalizes claimed-but-non-submitting agents (blocked by design issue)", () => {});
  });
});
