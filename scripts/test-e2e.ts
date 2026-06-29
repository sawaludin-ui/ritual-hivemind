import { readFile } from "node:fs/promises";
import path from "node:path";
import { createWalletClient, createPublicClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

type DeploymentRecord = {
  hiveCore: string;
  swarmExecution: string;
  agentReputation: string;
  teeVerifier: string;
  chainId: string;
};

async function loadDeployment(): Promise<DeploymentRecord> {
  const file = path.resolve("deployments", "ritual.json");
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw) as DeploymentRecord;
}

const CORE_ABI = [
  { type: "function", name: "registerAgent", inputs: [{ name: "name", type: "string" }, { name: "capabilities", type: "string[]" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "createTask", inputs: [{ name: "prompt", type: "string" }, { name: "minAgents", type: "uint8" }, { name: "maxAgents", type: "uint8" }, { name: "minSubmissions", type: "uint8" }, { name: "deadline", type: "uint64" }], outputs: [{ name: "taskId", type: "uint256" }], stateMutability: "payable" },
  { type: "function", name: "getTask", inputs: [{ name: "taskId", type: "uint256" }], outputs: [{ type: "uint256" }, { type: "address" }, { type: "string" }, { type: "uint256" }, { type: "uint8" }, { type: "uint8" }, { type: "uint8" }, { type: "uint64" }, { type: "uint8" }, { type: "address[]" }, { type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getAgent", inputs: [{ name: "wallet", type: "address" }], outputs: [{ type: "address" }, { type: "string" }, { type: "string[]" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "bool" }], stateMutability: "view" },
] as const;

const CHAIN = { id: 1979, name: "Ritual", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.ritualfoundation.org"] } } } as const;

async function main() {
  const deployment = await loadDeployment();
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set");

  const account = privateKeyToAccount(pk as `0x${string}`);
  const publicClient = createPublicClient({ chain: CHAIN, transport: http() });
  const walletClient = createWalletClient({ account, chain: CHAIN, transport: http() });
  const hiveCore = deployment.hiveCore;

  console.log(`Deployer: ${account.address}\n`);
  console.log(`Using deployed core: ${hiveCore}`);

  // Read current block timestamp
  const block = await publicClient.getBlock();
  const deadline = block.timestamp + 86400n; // +1 day, huge margin
  console.log(`Current block: ${block.number}`);
  console.log(`Setting deadline: ${deadline} (${new Date(Number(deadline) * 1000).toISOString()})\n`);

  // 1. Register agent (already done in prev attempt, but idempotent)
  console.log("1. Register agent...");
  try {
    const tx = await walletClient.writeContract({ address: hiveCore, abi: CORE_ABI, functionName: "registerAgent", args: ["NurutBot", ["research", "code"]] });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    console.log(`   ✅ Registered`);
  } catch (e: any) {
    if (e.message?.includes("AgentAlreadyRegistered") || e.message?.includes("e098d3ee")) {
      console.log(`   ⏭️  Already registered`);
    } else { throw e; }
  }

  // 2. Create task with +1 day deadline
  console.log("2. Creating task...");
  const tx2 = await walletClient.writeContract({
    address: hiveCore, abi: CORE_ABI, functionName: "createTask",
    args: ["Research Ritual precompile docs", 1, 3, 0, deadline],
    value: parseEther("0.01"),
  });
  const r2 = await publicClient.waitForTransactionReceipt({ hash: tx2 });
  console.log(`   ✅ Task created — block ${r2.blockNumber}`);

  // 3. Read back
  const task = await publicClient.readContract({ address: hiveCore, abi: CORE_ABI, functionName: "getTask", args: [1n] });
  console.log(`   Task #${task[0]}: "${task[2]}" — bounty ${(Number(task[3])/1e18).toFixed(4)} ETH — status ${task[8]}`);

  console.log("\n✅ All good!");
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
