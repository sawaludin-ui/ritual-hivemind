// @ts-check
import "dotenv/config";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ritual } from "./chains.mjs";
import { callLLM } from "./llm.mjs";

// --------------- Configuration -------------------------------------------
const RPC_URL = process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;
const HIVE_CORE = process.env.HIVE_CORE_ADDRESS ?? "0xa5284207c3DA247D2c986c8434d6c0336Aa7d725";
const SWARM_EXECUTION = process.env.SWARM_EXECUTION_ADDRESS ?? "0x937B181538Bd5dFDA8FFe62D82652CC4129F8F08";
const POLL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? "15000", 10);
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_TASKS ?? "3", 10);

if (!AGENT_PRIVATE_KEY) {
  console.error("❌ AGENT_PRIVATE_KEY not set in .env");
  process.exit(1);
}

const account = privateKeyToAccount(/** @type {`0x${string}`} */ (AGENT_PRIVATE_KEY));

const HIVE_CORE_ABI = parseAbi([
  "function getTask(uint256 taskId) external view returns (uint256,address,string,uint256,uint8,uint8,uint8,uint64,uint8,address[],uint256)",
  "function claimTask(uint256 taskId) external",
  "function getOpenTasks() external view returns (uint256[])",
  "function getAgent(address wallet) external view returns (address,string,string[],uint256,uint256,uint256,bool)",
]);

const SWARM_ABI = parseAbi([
  "function submitAnswer(uint256 taskId, string answer, bytes teeAttestation) external returns (uint256)",
]);

// --------------- Clients --------------------------------------------------
const publicClient = createPublicClient({ chain: ritual, transport: http(RPC_URL) });
const walletClient = createWalletClient({ chain: ritual, account, transport: http(RPC_URL) });

// --------------- State ----------------------------------------------------
const processedTasks = new Set();
const activeTaskCount = new Map();
let running = true;

// --------------- Main -----------------------------------------------------
async function main() {
  console.log(`\n🐝 HIVEMIND Agent — Live`);
  console.log(`   Wallet:  ${account.address}`);
  console.log(`   Polling every ${POLL_MS / 1000}s | Max concurrent: ${MAX_CONCURRENT}\n`);

  // Verify agent is registered
  try {
    const agent = await publicClient.readContract({
      address: /** @type {`0x${string}`} */ (HIVE_CORE),
      abi: HIVE_CORE_ABI,
      functionName: "getAgent",
      args: [account.address],
    });
    console.log(`✅ Agent "${agent[1]}" active — ${agent[3]} reputation, ${agent[4]} tasks completed\n`);
  } catch {
    console.error("❌ Agent not registered. Run: npm run register");
    process.exit(1);
  }

  // Graceful shutdown
  process.on("SIGINT", () => { running = false; console.log("\n🛑 Shutting down..."); });
  process.on("SIGTERM", () => { running = false; });

  // Main loop
  while (running) {
    try {
      await processOpenTasks();
    } catch (err) {
      const msg = err?.shortMessage ?? err?.message ?? String(err);
      if (!String(msg).includes("AlreadyClaimed") && !String(msg).includes("TaskNotOpen")) {
        console.error(`⚠️  Error: ${msg}`);
      }
    }
    await sleep(POLL_MS);
  }
}

async function processOpenTasks() {
  const openTasks = await publicClient.readContract({
    address: /** @type {`0x${string}`} */ (HIVE_CORE),
    abi: HIVE_CORE_ABI,
    functionName: "getOpenTasks",
  });

  for (const taskId of openTasks) {
    const tid = String(taskId);
    if (processedTasks.has(tid)) continue;
    if (activeTaskCount.size >= MAX_CONCURRENT) return;

    // Mark seen
    processedTasks.add(tid);

    try {
      const task = await publicClient.readContract({
        address: /** @type {`0x${string}`} */ (HIVE_CORE),
        abi: HIVE_CORE_ABI,
        functionName: "getTask",
        args: [taskId],
      });

      const id = task[0];
      const prompt = task[2];
      const deadline = task[7];
      const status = task[8];

      // Skip stale (Ritual chain uses ms timestamps, Date.now() is also ms)
      if (deadline && Number(deadline) < Date.now()) continue;
      if (status !== 0 && status !== 1) continue;

      // Claim
      console.log(`📋 Task #${id} — claiming...`);
      const claimHash = await walletClient.writeContract({
        address: /** @type {`0x${string}`} */ (HIVE_CORE),
        abi: HIVE_CORE_ABI,
        functionName: "claimTask",
        args: [taskId],
      });
      await publicClient.waitForTransactionReceipt({ hash: claimHash });
      console.log(`   ✅ Claimed (${claimHash.slice(0, 10)}...)`);

      // Process in background
      activeTaskCount.set(tid, true);
      processTask(BigInt(id), prompt).finally(() => {
        activeTaskCount.delete(tid);
      });
    } catch (err) {
      const msg = err?.shortMessage ?? err?.message ?? String(err);
      // These are normal — someone else claimed it first
      if (String(msg).includes("AlreadyClaimed") || String(msg).includes("TaskNotOpen")) {
        // ok
      } else {
        console.error(`⚠️  Task #${taskId}: ${msg}`);
      }
    }
  }
}

/**
 * @param {bigint} taskId
 * @param {string} prompt
 */
async function processTask(taskId, prompt) {
  try {
    console.log(`🤖 Task #${taskId} — running LLM inference...`);
    const answer = await callLLM(prompt);

    // Submit with mock TEE attestation (replace with real attestation on Ritual)
    const teeAttestation = "0x00"; // Placeholder — Ritual TEE SDK replaces this
    console.log(`📤 Task #${taskId} — submitting answer...`);
    const hash = await walletClient.writeContract({
      address: /** @type {`0x${string}`} */ (SWARM_EXECUTION),
      abi: SWARM_ABI,
      functionName: "submitAnswer",
      args: [taskId, answer, /** @type {`0x${string}`} */ (teeAttestation)],
    });
    await publicClient.waitForTransactionReceipt({ hash });

    console.log(`⭐ Task #${taskId} — done!  (${hash.slice(0, 10)}...)`);
  } catch (err) {
    const msg = err?.shortMessage ?? err?.message ?? String(err);
    console.error(`❌ Task #${taskId}: ${msg}`);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("❌", err?.shortMessage ?? err?.message ?? String(err));
  process.exit(1);
});
