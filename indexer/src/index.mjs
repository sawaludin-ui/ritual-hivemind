// @ts-check
import "dotenv/config";
import { createPublicClient, http, parseAbi } from "viem";
import { ritual } from "./chains.mjs";
import { StateStore } from "./store.mjs";
import { WebSocketServer } from "./ws.mjs";

// --------------- Configuration -------------------------------------------
const RPC_URL = process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";
const WS_PORT = parseInt(process.env.WS_PORT ?? "3001", 10);
const POLL_MS = parseInt(process.env.INDEXER_POLL_MS ?? "5000", 10);

const HIVE_CORE = process.env.HIVE_CORE_ADDRESS ?? "0xa5284207c3DA247D2c986c8434d6c0336Aa7d725";
const SWARM_EXECUTION = process.env.SWARM_EXECUTION_ADDRESS ?? "0x937B181538Bd5dFDA8FFe62D82652CC4129F8F08";
const AGENT_REPUTATION = process.env.AGENT_REPUTATION_ADDRESS ?? "0x884132e3bFC2c8A64f2f5DF32be0512b0B903D49";

// --------------- ABIs ----------------------------------------------------
const HIVE_CORE_ABI = parseAbi([
  "function taskCount() external view returns (uint256)",
  "function getTask(uint256 taskId) external view returns (uint256,address,string,uint256,uint8,uint8,uint8,uint64,uint8,address[],uint256)",
  "function getAgent(address wallet) external view returns (address,string,string[],uint256,uint256,uint256,bool)",
  "function getOpenTasks() external view returns (uint256[])",
]);

const AGENT_REPUTATION_ABI = parseAbi([
  "function getLeaderboard(uint256 limit) external view returns (address[],uint256[])",
  "function knownAgents() external view returns (address[])",
  "function getAgentTotals(address) external view returns (uint256,uint256,uint256)",
]);

const SWARM_ABI = parseAbi([
  "function getSubmissions(uint256 taskId) external view returns ((uint256,uint256,address,string,bytes,uint64,bool)[])",
  "function getSynthesis(uint256 taskId) external view returns ((uint256,address,string,uint8,address[],string[]))",
]);

// --------------- Clients --------------------------------------------------
const publicClient = createPublicClient({
  chain: ritual,
  transport: http(RPC_URL),
  batch: { multicall: true },
});

// --------------- State ----------------------------------------------------
const store = new StateStore();
const wsServer = new WebSocketServer(WS_PORT);

let running = true;

// --------------- Sync Logic -----------------------------------------------

async function syncAll() {
  try {
    // 1. Task count
    const count = await publicClient.readContract({
      address: /** @type {`0x${string}`} */ (HIVE_CORE),
      abi: HIVE_CORE_ABI,
      functionName: "taskCount",
    });
    const total = Number(count);

    if (total !== store.taskCount) {
      store.taskCount = total;

      // Fetch new tasks (from last known + 1 to current)
      const startId = Math.max(1, store.tasks.size === 0 ? Math.max(1, total - 50) : total - 10);
      for (let i = startId; i <= total; i++) {
        await syncTask(BigInt(i));
      }
    } else {
      // Still refresh active tasks (status changes)
      for (const taskId of store.tasks.keys()) {
        const task = store.tasks.get(taskId);
        if (task && (task.status === 0 || task.status === 1 || task.status === 2)) {
          await syncTask(BigInt(taskId));
        }
      }
    }

    // 2. Known agents
    const knownAgents = await publicClient.readContract({
      address: /** @type {`0x${string}`} */ (AGENT_REPUTATION),
      abi: AGENT_REPUTATION_ABI,
      functionName: "knownAgents",
    });

    if (knownAgents.length !== store.knownAgents.length) {
      store.knownAgents = [...knownAgents];
      for (const addr of knownAgents) {
        await syncAgent(addr);
      }
    }

    // 3. Block number
    const block = await publicClient.getBlockNumber();
    store.lastBlock = Number(block);

    // 4. Broadcast update
    wsServer.broadcast(JSON.stringify({
      type: "state",
      data: store.snapshot(),
      timestamp: Date.now(),
    }));
  } catch (err) {
    const msg = err?.shortMessage ?? err?.message ?? String(err);
    console.error(`⚠️  Sync error: ${msg}`);
  }
}

async function syncTask(taskId) {
  try {
    const task = await publicClient.readContract({
      address: /** @type {`0x${string}`} */ (HIVE_CORE),
      abi: HIVE_CORE_ABI,
      functionName: "getTask",
      args: [taskId],
    });

    const [
      id, creator, prompt, bounty,
      minAgents, maxAgents, minSubmissions, deadline,
      status, claimedAgents, synthesisId,
    ] = task;

    const stored = store.tasks.get(String(id));

    store.tasks.set(String(id), {
      id: Number(id),
      creator,
      prompt,
      bounty: bounty.toString(),
      minAgents,
      maxAgents,
      minSubmissions,
      deadline: Number(deadline),
      status,
      claimedAgents,
      synthesisId: Number(synthesisId),
      createdAt: stored?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    });

    // Fetch submissions if status is Executing or beyond
    if (status >= 1) {
      await syncSubmissions(taskId);
    }

    // Fetch synthesis if Complete
    if (status === 3) {
      await syncSynthesis(taskId);
    }

    // Log new/updated tasks
    if (!stored) {
      console.log(`🆕 Task #${id} — ${prompt.slice(0, 60)}...`);
    } else if (stored.status !== status) {
      const labels = ["Open", "Executing", "Synthesizing", "Complete", "Failed"];
      console.log(`🔄 Task #${id} — ${labels[stored.status]} → ${labels[status]}`);
    }
  } catch {
    // Task may not exist yet (ID gaps) — ignore
  }
}

async function syncSubmissions(taskId) {
  try {
    const subs = await publicClient.readContract({
      address: /** @type {`0x${string}`} */ (SWARM_EXECUTION),
      abi: SWARM_ABI,
      functionName: "getSubmissions",
      args: [taskId],
    });

    const formatted = (subs ?? []).map(/** @param {any} s */ (s) => ({
      id: Number(s.id),
      taskId: Number(s.taskId),
      agent: s.agent,
      answer: s.answer,
      teeAttestation: s.teeAttestation,
      timestamp: Number(s.timestamp),
      verified: s.verified,
    }));

    const prev = store.submissions.get(String(taskId)) ?? [];
    if (formatted.length !== prev.length) {
      console.log(`📨 Task #${taskId} — ${formatted.length} submissions (was ${prev.length})`);
    }

    store.submissions.set(String(taskId), formatted);
  } catch {
    // ignore
  }
}

async function syncSynthesis(taskId) {
  try {
    const syn = await publicClient.readContract({
      address: /** @type {`0x${string}`} */ (SWARM_EXECUTION),
      abi: SWARM_ABI,
      functionName: "getSynthesis",
      args: [taskId],
    });

    store.syntheses.set(String(taskId), {
      taskId: Number(syn[0]),
      synthesizer: syn[1],
      consensusReport: syn[2],
      consensusScore: Number(syn[3]),
      contributors: syn[4],
      dissents: syn[5],
    });
  } catch {
    // ignore
  }
}

async function syncAgent(address) {
  try {
    const agent = await publicClient.readContract({
      address: /** @type {`0x${string}`} */ (HIVE_CORE),
      abi: HIVE_CORE_ABI,
      functionName: "getAgent",
      args: [address],
    });

    const totals = await publicClient.readContract({
      address: /** @type {`0x${string}`} */ (AGENT_REPUTATION),
      abi: AGENT_REPUTATION_ABI,
      functionName: "getAgentTotals",
      args: [address],
    });

    store.agents.set(address, {
      address,
      name: agent[1],
      capabilities: [...agent[2]],
      reputation: Number(totals[0]),
      tasksCompleted: Number(totals[1]),
      totalEarned: totals[2].toString(),
      active: agent[6],
    });
  } catch {
    // ignore
  }
}

// --------------- Main -----------------------------------------------------
async function main() {
  console.log("\n📡 HIVEMIND Indexer — Starting");
  console.log(`   RPC:  ${RPC_URL}`);
  console.log(`   WS:   ws://localhost:${WS_PORT}`);
  console.log(`   Poll: ${POLL_MS / 1000}s\n`);

  // Graceful shutdown
  process.on("SIGINT", () => { running = false; shutdown(); });
  process.on("SIGTERM", () => { running = false; shutdown(); });

  // Initial sync
  console.log("🔄 Initial sync...");
  await syncAll();
  console.log(`   ✅ ${store.taskCount} tasks, ${store.knownAgents.length} agents indexed\n`);

  // Main poll loop
  while (running) {
    await syncAll();
    await sleep(POLL_MS);
  }
}

function shutdown() {
  console.log("\n🛑 Shutting down...");
  wsServer.close();
  process.exit(0);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("❌", err?.shortMessage ?? err?.message ?? String(err));
  process.exit(1);
});
