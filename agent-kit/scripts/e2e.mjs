// @ts-check
import "dotenv/config";
import { createPublicClient, createWalletClient, http, parseAbi, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ritual } from "./chains.mjs";

/**
 * END-TO-END LIFECYCLE TEST
 *
 * Runs one complete Hivemind task lifecycle on Ritual testnet:
 *   1. Register agent
 *   2. Create task (with bounty)
 *   3. Agent claims task
 *   4. Agent submits answer
 *   5. Synthesize → verify → consensus → bounty release
 *
 * Verifies the entire MVP path works end-to-end.
 */

// --------------- Configuration -------------------------------------------
const RPC_URL = process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";
const AGENT_KEY = process.env.AGENT_PRIVATE_KEY;
const HIVE_CORE = process.env.HIVE_CORE_ADDRESS ?? "0xa5284207c3DA247D2c986c8434d6c0336Aa7d725";
const SWARM_EXECUTION = process.env.SWARM_EXECUTION_ADDRESS ?? "0x937B181538Bd5dFDA8FFe62D82652CC4129F8F08";
const AGENT_REPUTATION = process.env.AGENT_REPUTATION_ADDRESS ?? "0x884132e3bFC2c8A64f2f5DF32be0512b0B903D49";

if (!AGENT_KEY) {
  console.error("❌ AGENT_PRIVATE_KEY not set in .env");
  process.exit(1);
}

const account = privateKeyToAccount(/** @type {`0x${string}`} */ (AGENT_KEY));

// --------------- ABIs ----------------------------------------------------
const HIVE_CORE_ABI = parseAbi([
  "function registerAgent(string name, string[] capabilities) external",
  "function createTask(string prompt, uint8 minAgents, uint8 maxAgents, uint8 minSubmissions, uint64 deadline) external payable returns (uint256)",
  "function claimTask(uint256 taskId) external",
  "function getTask(uint256 taskId) external view returns (uint256,address,string,uint256,uint8,uint8,uint8,uint64,uint8,address[],uint256)",
  "function getAgent(address wallet) external view returns (address,string,string[],uint256,uint256,uint256,bool)",
  "function taskCount() external view returns (uint256)",
]);

const SWARM_ABI = parseAbi([
  "function submitAnswer(uint256 taskId, string answer, bytes teeAttestation) external returns (uint256)",
  "function synthesize(uint256 taskId, bytes llmPayload) external",
  "function getSubmissions(uint256 taskId) external view returns ((uint256,uint256,address,string,bytes,uint64,bool)[])",
  "function getSynthesis(uint256 taskId) external view returns ((uint256,address,string,uint8,address[],string[]))",
]);

// --------------- Clients --------------------------------------------------
const publicClient = createPublicClient({
  chain: ritual,
  transport: http(RPC_URL),
  /** @type {any} */ // batch to speed up lifecycle
  batch: { multicall: true },
});
const walletClient = createWalletClient({ chain: ritual, account, transport: http(RPC_URL) });

// --------------- Helpers --------------------------------------------------
let stage = 0;
function step(label) {
  stage++;
  console.log(`\n━━━ STEP ${stage} ━━━ ${label}`);
}

async function wait(txHash, label = "Confirmed") {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`   ✅ ${label} (block ${receipt.blockNumber})`);
  return receipt;
}

// --------------- Main -----------------------------------------------------
async function main() {
  console.log("\n🧪 HIVEMIND — End-to-End Lifecycle Test");
  console.log(`   Wallet: ${account.address}`);
  console.log(`   Chain:  Ritual testnet (1979)\n`);

  // ── STEP 1: Register agent (skip if already registered) ──
  step("Register agent");

  let agentName = "E2E Test Agent";
  try {
    const existing = await publicClient.readContract({
      address: /** @type {`0x${string}`} */ (HIVE_CORE),
      abi: HIVE_CORE_ABI,
      functionName: "getAgent",
      args: [account.address],
    });
    if (existing[6]) {
      agentName = existing[1];
      console.log(`   ℹ️  Already registered as "${agentName}"`);
    }
  } catch {
    console.log("   ⏳ Registering...");
    const hash = await walletClient.writeContract({
      address: /** @type {`0x${string}`} */ (HIVE_CORE),
      abi: HIVE_CORE_ABI,
      functionName: "registerAgent",
      args: ["E2E Test Agent", ["research", "analysis"]],
    });
    await wait(hash, "Agent registered");
  }

  // ── STEP 2: Create task with bounty ──
  step("Create task with bounty");

  // Ritual RPC returns timestamp in MILLISECONDS, not seconds.
  // Use chain block timestamp to avoid TaskExpired.
  const block = await publicClient.getBlock();
  const now = Number(block.timestamp); // already in chain-native units
  const deadline = BigInt(now + 3600000); // 1 hour in ms (Ritual chain uses ms timestamps)
  const bountyEth = "0.0001"; // tiny testnet amount
  const bountyWei = parseEther(bountyEth);

  console.log(`   Chain time: ${now} (${new Date(now * 1000).toISOString()})`);
  console.log(`   Bounty: ${bountyEth} RITUAL`);
  console.log(`   Config: 1-3 agents, 1 min submission, 1h deadline`);

  let taskId;
  try {
    const hash = await walletClient.writeContract({
      address: /** @type {`0x${string}`} */ (HIVE_CORE),
      abi: HIVE_CORE_ABI,
      functionName: "createTask",
      args: [
        "E2E Test: What is the capital of France? Answer in one sentence.",
        1, // minAgents
        3, // maxAgents
        1, // minSubmissions
        deadline,
      ],
      value: bountyWei,
    });
    const receipt = await wait(hash, "Task created");
    console.log(`   Tx: ${hash}`);

    // Read taskId from event (or from taskCount)
    const count = await publicClient.readContract({
      address: /** @type {`0x${string}`} */ (HIVE_CORE),
      abi: HIVE_CORE_ABI,
      functionName: "taskCount",
    });
    taskId = count;
    console.log(`   TaskId: ${taskId}`);
  } catch (err) {
    console.error(`❌ Failed: ${err?.shortMessage ?? err?.message}`);
    process.exit(1);
  }

  // ── STEP 3: Agent claims task ──
  step(`Claim task #${taskId}`);

  try {
    const hash = await walletClient.writeContract({
      address: /** @type {`0x${string}`} */ (HIVE_CORE),
      abi: HIVE_CORE_ABI,
      functionName: "claimTask",
      args: [taskId],
    });
    await wait(hash, "Task claimed");
  } catch (err) {
    console.error(`❌ Failed: ${err?.shortMessage ?? err?.message}`);
    process.exit(1);
  }

  // ── STEP 4: Submit answer ──
  step(`Submit answer for task #${taskId}`);

  const answer =
    "The capital of France is Paris. It is the largest city in France and has been the capital since the 10th century.";
  const teeAttestation = "0x00"; // Mock attestation (real TEE on Ritual replaces this)

  try {
    const hash = await walletClient.writeContract({
      address: /** @type {`0x${string}`} */ (SWARM_EXECUTION),
      abi: SWARM_ABI,
      functionName: "submitAnswer",
      args: [taskId, answer, /** @type {`0x${string}`} */ (teeAttestation)],
    });
    await wait(hash, "Answer submitted");
    console.log(`   Answer: "${answer.slice(0, 80)}..."`);
  } catch (err) {
    console.error(`❌ Failed: ${err?.shortMessage ?? err?.message}`);
    process.exit(1);
  }

  // ── STEP 5: Synthesize ──
  step(`Synthesize task #${taskId}`);

  try {
    // Use empty payload → contract uses _composeConsensusReport fallback
    const hash = await walletClient.writeContract({
      address: /** @type {`0x${string}`} */ (SWARM_EXECUTION),
      abi: SWARM_ABI,
      functionName: "synthesize",
      args: [taskId, "0x"],
    });
    await wait(hash, "Synthesis complete");
  } catch (err) {
    console.error(`❌ Failed: ${err?.shortMessage ?? err?.message}`);
    process.exit(1);
  }

  // ── VERIFICATION: Read final state ──
  step("Verify final state");

  const task = await publicClient.readContract({
    address: /** @type {`0x${string}`} */ (HIVE_CORE),
    abi: HIVE_CORE_ABI,
    functionName: "getTask",
    args: [taskId],
  });

  const status = task[8];
  const statusLabels = { 0: "Open", 1: "Executing", 2: "Synthesizing", 3: "Complete", 4: "Failed" };
  console.log(`   Status: ${statusLabels[status]}`);

  if (status !== 3) {
    console.error(`❌ Expected status 3 (Complete), got ${status}`);
    process.exit(1);
  }

  const synthesis = await publicClient.readContract({
    address: /** @type {`0x${string}`} */ (SWARM_EXECUTION),
    abi: SWARM_ABI,
    functionName: "getSynthesis",
    args: [taskId],
  });

  console.log(`   Synthesis score: ${synthesis[3]}/10`);
  console.log(`   Contributors:    ${synthesis[4].length} agents`);
  console.log(`   Report preview:  "${String(synthesis[2]).slice(0, 100)}..."`);

  // Check agent totals
  const agentTotals = await publicClient.readContract({
    address: /** @type {`0x${string}`} */ (AGENT_REPUTATION),
    abi: parseAbi(["function getAgentTotals(address) external view returns (uint256,uint256,uint256)"]),
    functionName: "getAgentTotals",
    args: [account.address],
  });

  console.log(`\n   🏆 Agent "${agentName}" stats:`);
  console.log(`      Reputation: ${agentTotals[0]}`);
  console.log(`      Completed:  ${agentTotals[1]}`);
  console.log(`      Earned:     ${(Number(agentTotals[2]) / 1e18).toFixed(6)} RITUAL`);

  // ── DONE ──
  console.log("\n═══════════════════════════════════════");
  console.log("  ✅ END-TO-END LIFECYCLE — SUCCESS");
  console.log("═══════════════════════════════════════");
  console.log(`\n  Task #${taskId} completed the full lifecycle:`);
  console.log("  Register → Create → Claim → Submit → Synthesize → Verify");
  console.log(`\n  Explorer: https://explorer.ritualfoundation.org/tx/${taskId}\n`);
}

main().catch((err) => {
  console.error("\n❌ E2E TEST FAILED:", err?.shortMessage ?? err?.message ?? String(err));
  process.exit(1);
});
