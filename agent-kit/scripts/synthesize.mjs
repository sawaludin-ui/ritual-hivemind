// @ts-check
import "dotenv/config";
import { createPublicClient, createWalletClient, http, parseAbi, encodeAbiParameters, parseAbiParameters } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ritual } from "./chains.mjs";

/**
 * SYNTHESIS RUNNER — The missing link.
 *
 * After agents submit answers, this script watches for tasks where
 * minSubmissions has been met and triggers:
 *   synthesize() → verify → consensus report → bounty release → reputation update
 *
 * Without this, tasks stay in "Executing" forever and bounties never pay out.
 */

// --------------- Configuration -------------------------------------------
const RPC_URL = process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";
const SYNTHESIZER_KEY = process.env.SYNTHESIZER_PRIVATE_KEY ?? process.env.AGENT_PRIVATE_KEY;
const HIVE_CORE = process.env.HIVE_CORE_ADDRESS ?? "0xa5284207c3DA247D2c986c8434d6c0336Aa7d725";
const SWARM_EXECUTION = process.env.SWARM_EXECUTION_ADDRESS ?? "0x937B181538Bd5dFDA8FFe62D82652CC4129F8F08";
const POLL_MS = parseInt(process.env.SYNTHESIS_POLL_MS ?? process.env.POLL_INTERVAL_MS ?? "30000", 10);
const LLM_MODEL = process.env.LLM_MODEL ?? "gpt-4o";

if (!SYNTHESIZER_KEY) {
  console.error("❌ SYNTHESIZER_PRIVATE_KEY (or AGENT_PRIVATE_KEY) not set in .env");
  process.exit(1);
}

const account = privateKeyToAccount(/** @type {`0x${string}`} */ (SYNTHESIZER_KEY));

const HIVE_CORE_ABI = parseAbi([
  "function taskCount() external view returns (uint256)",
  "function getTask(uint256 taskId) external view returns (uint256,address,string,uint256,uint8,uint8,uint8,uint64,uint8,address[],uint256)",
  "function getAgent(address wallet) external view returns (address,string,string[],uint256,uint256,uint256,bool)",
]);

const SWARM_ABI = parseAbi([
  "function synthesize(uint256 taskId, bytes llmPayload) external",
  "function getSubmissions(uint256 taskId) external view returns ((uint256,uint256,address,string,bytes,uint64,bool)[])",
  "function getSynthesis(uint256 taskId) external view returns ((uint256,address,string,uint8,address[],string[]))",
]);

// --------------- Clients --------------------------------------------------
const publicClient = createPublicClient({ chain: ritual, transport: http(RPC_URL) });
const walletClient = createWalletClient({ chain: ritual, account, transport: http(RPC_URL) });

// --------------- State ----------------------------------------------------
const synthesizedTasks = new Set();
let running = true;

// --------------- Helpers --------------------------------------------------

/**
 * Build a consensus prompt for the LLM precompile.
 * On Ritual chain this becomes the input to precompile 0x0802.
 * Falls back to on-chain _composeConsensusReport() when payload is empty.
 *
 * @param {string} taskPrompt
 * @param {Array<{ answer: string, agent: string }>} verifiedAnswers
 * @returns {`0x${string}`} ABI-encoded llmPayload for precompile 0x0802
 */
function buildSynthesisPayload(taskPrompt, verifiedAnswers) {
  // If no LLM synthesis desired, return empty payload.
  // The contract falls back to _composeConsensusReport() which concatenates
  // all answers into a text report. This is functionally correct and
  // doesn't require the Ritual LLM precompile ABI.
  if (!process.env.LLM_SYNTHESIS || verifiedAnswers.length === 0) {
    return "0x";
  }

  // Ritual LLM precompile input encoding:
  //   (string model, bool stream, LlmMessages[] messages, uint256 maxTokens, uint256 temperature)
  //
  // LlmMessage = { string role, string content }
  const submissionsText = verifiedAnswers
    .map((s, i) => `Agent ${i + 1}: ${s.answer}`)
    .join("\n\n---\n\n");

  const messages = [
    { role: "system", content: "You are a consensus synthesizer. Given multiple AI agent answers, produce a consolidated report that identifies points of agreement, highlights divergent opinions, and gives a final consensus with confidence score." },
    { role: "user", content: `TASK:\n${taskPrompt}\n\nAGENT ANSWERS:\n${submissionsText}\n\nProduce a consensus report.` },
  ];

  // Encode: (string model, bool stream, (string role, string content)[] messages, uint256 maxTokens, uint256 temperature)
  try {
    return /** @type {`0x${string}`} */ (encodeAbiParameters(
      parseAbiParameters("string, bool, (string, string)[], uint256, uint256"),
      [LLM_MODEL, false, messages, BigInt(4096), BigInt(0.3 * 1e4)] // temperature 0.3 × 10000 basis points??
    ));
  } catch {
    // Fallback gracefully
    return "0x";
  }
}

/**
 * Fetch ALL tasks in Executing (status=1) or Open (status=0) state.
 * The contract doesn't expose getExecutingTasks(), so we iterate.
 */
async function getCandidateTasks() {
  const count = await publicClient.readContract({
    address: /** @type {`0x${string}`} */ (HIVE_CORE),
    abi: HIVE_CORE_ABI,
    functionName: "taskCount",
  });

  const candidates = [];
  const total = Number(count);

  // Check last 100 tasks (newer tasks more likely to need synthesis)
  const from = Math.max(1, total - 100);
  for (let i = from; i <= total; i++) {
    if (synthesizedTasks.has(String(i))) continue;

    try {
      const task = await publicClient.readContract({
        address: /** @type {`0x${string}`} */ (HIVE_CORE),
        abi: HIVE_CORE_ABI,
        functionName: "getTask",
        args: [BigInt(i)],
      });

      const status = task[8]; // uint8 enum: 0=Open, 1=Executing, 2=Synthesizing, 3=Complete, 4=Failed

      // Only Executing (1) — tasks with agents, receiving submissions
      if (status === 1) {
        candidates.push({
          taskId: BigInt(i),
          prompt: task[2],
          minSubmissions: task[6],
          deadline: task[7],
        });
      }
    } catch {
      // Task may not exist (ID gaps) — skip
    }
  }

  return candidates;
}

// --------------- Main -----------------------------------------------------
async function main() {
  console.log(`\n🧠 HIVEMIND Synthesis Runner — Live`);
  console.log(`   Wallet:     ${account.address}`);
  console.log(`   Polling:    every ${POLL_MS / 1000}s`);
  console.log(`   LLM model:  ${process.env.LLM_SYNTHESIS ? LLM_MODEL : "off (fallback report)"}\n`);

  // Verify synthesizer is a registered agent
  try {
    const agent = await publicClient.readContract({
      address: /** @type {`0x${string}`} */ (HIVE_CORE),
      abi: HIVE_CORE_ABI,
      functionName: "getAgent",
      args: [account.address],
    });
    console.log(`✅ Synthesizer agent "${agent[1]}" active\n`);
  } catch {
    console.error("❌ Synthesizer wallet is not a registered agent. Run: npm run register");
    process.exit(1);
  }

  process.on("SIGINT", () => { running = false; console.log("\n🛑 Shutting down..."); });
  process.on("SIGTERM", () => { running = false; });

  while (running) {
    try {
      await synthesizeReadyTasks();
    } catch (err) {
      const msg = err?.shortMessage ?? err?.message ?? String(err);
      console.error(`⚠️  Synthesis loop error: ${msg}`);
    }
    await sleep(POLL_MS);
  }
}

async function synthesizeReadyTasks() {
  const candidates = await getCandidateTasks();

  for (const { taskId, prompt, minSubmissions, deadline } of candidates) {
    const tid = String(taskId);

    // Skip if deadline not passed (don't synthesize early)
    // Actually — we SHOULD synthesize as soon as minSubmissions met.
    // The deadline is for agent claims, not for synthesis.
    // But we skip expired tasks that are still Executing (they'll be Failed soon).
    // (Ritual chain uses ms timestamps, Date.now() is also ms)
    if (deadline && Number(deadline) < Date.now()) {
      console.log(`⏰ Task #${tid} — deadline passed, skipping`);
      synthesizedTasks.add(tid);
      continue;
    }

    // Check submissions
    let submissions;
    try {
      submissions = await publicClient.readContract({
        address: /** @type {`0x${string}`} */ (SWARM_EXECUTION),
        abi: SWARM_ABI,
        functionName: "getSubmissions",
        args: [taskId],
      });
    } catch (err) {
      console.error(`⚠️  Task #${tid}: Failed to fetch submissions — ${err?.shortMessage ?? err?.message}`);
      continue;
    }

    if (!submissions || submissions.length < Number(minSubmissions)) {
      continue; // Not enough answers yet
    }

    // We have enough submissions — synthesize!
    const verifiedAnswers = submissions
      .filter((/** @type {any} */ s) => s.answer && s.answer.length > 0)
      .map((/** @type {any} */ s) => ({ answer: s.answer, agent: s.agent }));

    if (verifiedAnswers.length < Number(minSubmissions)) {
      continue;
    }

    console.log(`\n🧬 Task #${tid} — ${submissions.length} submissions (${verifiedAnswers.length} valid, need ${minSubmissions})`);
    console.log(`   Synthesizing swarm consensus...`);

    const llmPayload = buildSynthesisPayload(prompt, verifiedAnswers);

    try {
      const hash = await walletClient.writeContract({
        address: /** @type {`0x${string}`} */ (SWARM_EXECUTION),
        abi: SWARM_ABI,
        functionName: "synthesize",
        args: [taskId, llmPayload],
      });

      console.log(`   Tx: ${hash}`);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ Synthesized! Block ${receipt.blockNumber}`);

      // Read the result
      const synthesis = await publicClient.readContract({
        address: /** @type {`0x${string}`} */ (SWARM_EXECUTION),
        abi: SWARM_ABI,
        functionName: "getSynthesis",
        args: [taskId],
      });

      console.log(`   📊 Score:   ${synthesis[3]}/10`);
      console.log(`   👥 Agents:  ${synthesis[4].length} contributors`);
      console.log(`   💬 Dissent: ${synthesis[5].length} opinions`);
      if (synthesis[2]) {
        console.log(`   📝 Report:  ${String(synthesis[2]).slice(0, 120)}${String(synthesis[2]).length > 120 ? "…" : ""}`);
      }

      synthesizedTasks.add(tid);
    } catch (err) {
      const msg = err?.shortMessage ?? err?.message ?? String(err);
      if (String(msg).includes("NotEnoughVerifiedSubmissions")) {
        // Verification failed — will retry if more submissions come in
        console.log(`   ⚠️  Not enough verified — waiting for more submissions`);
      } else if (String(msg).includes("TaskClosed")) {
        console.log(`   ⚠️  Task already closed`);
        synthesizedTasks.add(tid);
      } else {
        console.error(`   ❌ Synthesis failed: ${msg}`);
      }
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("❌", err?.shortMessage ?? err?.message ?? String(err));
  process.exit(1);
});
