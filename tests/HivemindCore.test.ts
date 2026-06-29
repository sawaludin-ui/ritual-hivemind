import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { parseEther } from "viem";
import { deployHivemind, futureDeadline, type HivemindFixture } from "./helpers.js";

/**
 * HivemindCore — agent registry, task lifecycle, bounty escrow.
 * Covers spec section 2 (HivemindCore.sol) + relevant security tests.
 */
describe("HivemindCore", () => {
  let f: HivemindFixture;

  beforeEach(async () => {
    f = await deployHivemind();
  });

  // ---------------------------------------------------------------- registerAgent
  describe("registerAgent", () => {
    it("registers an agent with default reputation 100", async () => {
      await f.core.write.registerAgent(["Alice", ["research", "math"]], {
        account: f.alice.account,
      });

      const rep = await f.reputation.read.getReputation([f.alice.account.address]);
      assert.equal(rep, 100n);

      const agent = await f.core.read.getAgent([f.alice.account.address]);
      // tuple: [wallet, name, capabilities, reputation, tasksCompleted, totalEarned, active]
      assert.equal(agent[1], "Alice");
      assert.equal(agent[3], 100n);
      assert.equal(agent[6], true);
    });

    it("stores capabilities correctly", async () => {
      await f.core.write.registerAgent(["Bob", ["nlp", "vision", "code"]], {
        account: f.bob.account,
      });
      const agent = await f.core.read.getAgent([f.bob.account.address]);
      assert.deepEqual([...agent[2]], ["nlp", "vision", "code"]);
    });

    it("reverts on duplicate registration", async () => {
      await f.core.write.registerAgent(["Alice", []], { account: f.alice.account });
      await f.viem.assertions.revertWithCustomError(
        f.core.write.registerAgent(["Alice2", []], { account: f.alice.account }),
        f.core,
        "AgentAlreadyRegistered",
      );
    });

    it("emits AgentRegistered", async () => {
      const tx = await f.core.write.registerAgent(["Alice", []], {
        account: f.alice.account,
      });
      await f.viem.assertions.emitWithArgs(tx, f.core, "AgentRegistered", [
        f.alice.account.address,
        "Alice",
      ]);
    });
  });

  // ---------------------------------------------------------------- createTask
  describe("createTask", () => {
    it("locks bounty in the contract", async () => {
      const deadline = await futureDeadline(f);
      const bounty = parseEther("1");
      const tx = await f.core.write.createTask(["Solve X", 1, 3, 0, deadline], {
        account: f.alice.account,
        value: bounty,
      });
      await f.viem.assertions.balancesHaveChanged(tx, [
        { address: f.core.address, amount: bounty },
      ]);

      const task = await f.core.read.getTask([1n]);
      assert.equal(task[3], bounty); // bounty field
    });

    it("reverts if bounty is zero", async () => {
      const deadline = await futureDeadline(f);
      await f.viem.assertions.revertWithCustomError(
        f.core.write.createTask(["X", 1, 3, 0, deadline], {
          account: f.alice.account,
          value: 0n,
        }),
        f.core,
        "InvalidBounty",
      );
    });

    it("reverts if minAgents > maxAgents", async () => {
      const deadline = await futureDeadline(f);
      await f.viem.assertions.revertWithCustomError(
        f.core.write.createTask(["X", 5, 3, 0, deadline], {
          account: f.alice.account,
          value: parseEther("1"),
        }),
        f.core,
        "InvalidTaskWindow",
      );
    });

    it("reverts if minAgents is zero", async () => {
      const deadline = await futureDeadline(f);
      await f.viem.assertions.revertWithCustomError(
        f.core.write.createTask(["X", 0, 3, 0, deadline], {
          account: f.alice.account,
          value: parseEther("1"),
        }),
        f.core,
        "InvalidTaskWindow",
      );
    });

    it("reverts if deadline is in the past", async () => {
      const block = await f.publicClient.getBlock();
      const past = block.timestamp - 1n;
      await f.viem.assertions.revertWithCustomError(
        f.core.write.createTask(["X", 1, 3, 0, past], {
          account: f.alice.account,
          value: parseEther("1"),
        }),
        f.core,
        "TaskExpired",
      );
    });

    it("emits TaskCreated with creator and bounty", async () => {
      const deadline = await futureDeadline(f);
      const bounty = parseEther("2");
      const tx = await f.core.write.createTask(["X", 1, 2, 0, deadline], {
        account: f.alice.account,
        value: bounty,
      });
      await f.viem.assertions.emitWithArgs(tx, f.core, "TaskCreated", [
        1n,
        f.alice.account.address,
        bounty,
      ]);
    });

    it("defaults minSubmissions to minAgents when passed 0", async () => {
      const deadline = await futureDeadline(f);
      await f.core.write.createTask(["X", 2, 4, 0, deadline], {
        account: f.alice.account,
        value: parseEther("1"),
      });
      const task = await f.core.read.getTask([1n]);
      // tuple: [id,creator,prompt,bounty,minAgents=4?,...] minSubmissions at idx 6
      assert.equal(task[6], 2); // minSubmissions defaulted to minAgents (2)
    });

    it("reverts if minSubmissions exceeds minAgents", async () => {
      const deadline = await futureDeadline(f);
      await f.viem.assertions.revertWithCustomError(
        f.core.write.createTask(["X", 2, 4, 3, deadline], {
          account: f.alice.account,
          value: parseEther("1"),
        }),
        f.core,
        "InvalidTaskWindow",
      );
    });

    it("increments taskCount", async () => {
      const deadline = await futureDeadline(f);
      await f.core.write.createTask(["A", 1, 2, 0, deadline], {
        account: f.alice.account,
        value: parseEther("1"),
      });
      await f.core.write.createTask(["B", 1, 2, 0, deadline], {
        account: f.alice.account,
        value: parseEther("1"),
      });
      assert.equal(await f.core.read.taskCount(), 2n);
    });
  });

  // ---------------------------------------------------------------- claimTask
  describe("claimTask", () => {
    let deadline: bigint;

    beforeEach(async () => {
      deadline = await futureDeadline(f);
      await f.core.write.registerAgent(["Alice", []], { account: f.alice.account });
      await f.core.write.registerAgent(["Bob", []], { account: f.bob.account });
      await f.core.write.createTask(["Task", 1, 2, 0, deadline], {
        account: f.carol.account,
        value: parseEther("1"),
      });
    });

    it("lets a registered agent claim an open slot", async () => {
      const tx = await f.core.write.claimTask([1n], { account: f.alice.account });
      await f.viem.assertions.emitWithArgs(tx, f.core, "TaskClaimed", [
        1n,
        f.alice.account.address,
      ]);
      const task = await f.core.read.getTask([1n]);
      assert.equal(task[9].length, 1); // claimedAgents (tuple idx 9 after minSubmissions)
    });

    it("moves task to Executing once minAgents reached", async () => {
      await f.core.write.claimTask([1n], { account: f.alice.account });
      const task = await f.core.read.getTask([1n]);
      assert.equal(task[8], 1); // status idx 8; TaskStatus.Executing == 1
    });

    it("keeps accepting claims after minAgents is reached, up to maxAgents", async () => {
      // FIXED design #1: task (min=1,max=2) flips to Executing after the first
      // claim, but the slot stays open so a second agent can still claim.
      await f.core.write.claimTask([1n], { account: f.alice.account }); // 1/2 -> Executing
      await f.core.write.claimTask([1n], { account: f.bob.account }); // 2/2, allowed
      const task = await f.core.read.getTask([1n]);
      assert.equal(task[9].length, 2); // both agents claimed
      assert.equal(task[8], 1); // status still Executing
    });

    it("reverts with TaskFull when maxAgents is exceeded", async () => {
      // Task min=1,max=2: fill both slots, then a 3rd claimant hits TaskFull.
      await f.core.write.registerAgent(["Dave", []], { account: f.dave.account });
      await f.core.write.claimTask([1n], { account: f.alice.account }); // 1/2
      await f.core.write.claimTask([1n], { account: f.bob.account }); // 2/2 full
      await f.viem.assertions.revertWithCustomError(
        f.core.write.claimTask([1n], { account: f.dave.account }),
        f.core,
        "TaskFull",
      );
    });

    it("reverts if agent not registered", async () => {
      await f.viem.assertions.revertWithCustomError(
        f.core.write.claimTask([1n], { account: f.dave.account }),
        f.core,
        "AgentNotRegistered",
      );
    });

    it("reverts on double-claim by same agent", async () => {
      // First claim moves a 1-min task straight to Executing, so re-claim hits TaskNotOpen.
      // Use a task with minAgents=2 to keep it Open after first claim.
      await f.core.write.createTask(["Task2", 2, 3, 0, deadline], {
        account: f.carol.account,
        value: parseEther("1"),
      });
      await f.core.write.claimTask([2n], { account: f.alice.account });
      await f.viem.assertions.revertWithCustomError(
        f.core.write.claimTask([2n], { account: f.alice.account }),
        f.core,
        "AlreadyClaimed",
      );
    });

    it("reverts on a non-existent task", async () => {
      await f.viem.assertions.revertWithCustomError(
        f.core.write.claimTask([999n], { account: f.alice.account }),
        f.core,
        "TaskNotFound",
      );
    });
  });

  // ---------------------------------------------------------------- getOpenTasks
  describe("getOpenTasks", () => {
    it("returns only Open tasks", async () => {
      const deadline = await futureDeadline(f);
      await f.core.write.registerAgent(["Alice", []], { account: f.alice.account });

      // Task 1: stays Open (min 2).
      await f.core.write.createTask(["Open", 2, 3, 0, deadline], {
        account: f.carol.account,
        value: parseEther("1"),
      });
      // Task 2: becomes Executing after a single claim (min 1).
      await f.core.write.createTask(["Exec", 1, 2, 0, deadline], {
        account: f.carol.account,
        value: parseEther("1"),
      });
      await f.core.write.claimTask([2n], { account: f.alice.account });

      const open = await f.core.read.getOpenTasks();
      assert.deepEqual([...open], [1n]);
    });
  });

  // ---------------------------------------------------------------- access control
  describe("access control", () => {
    it("blocks markTaskStatus from non-executors", async () => {
      const deadline = await futureDeadline(f);
      await f.core.write.createTask(["X", 1, 2, 0, deadline], {
        account: f.alice.account,
        value: parseEther("1"),
      });
      await f.viem.assertions.revertWithCustomError(
        f.core.write.markTaskStatus([1n, 3], { account: f.bob.account }),
        f.core,
        "NotAuthorizedExecutor",
      );
    });

    it("blocks setAuthorizedExecutor from non-owner", async () => {
      await f.viem.assertions.revertWithCustomError(
        f.core.write.setAuthorizedExecutor([f.bob.account.address, true], {
          account: f.bob.account,
        }),
        f.core,
        "NotOwner",
      );
    });
  });
});
