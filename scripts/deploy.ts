import hre from "hardhat";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type DeploymentRecord = {
  chainId: string;
  deployedAt: string;
  deployer?: string;
  teeVerifier: string;
  agentReputation: string;
  hivemindCore: string;
  swarmExecution: string;
  ritualWallet: string;
  ritualWalletFunded: boolean;
  explorerUrl: string;
};

/**
 * Ritual testnet fee-paying wallet.
 * Async precompiles (LLM 0x0802, HTTP 0x0801) pull execution fees from this
 * wallet rather than from msg.value. A small deposit is needed for the first
 * precompile call to succeed.
 */
const RITUAL_WALLET = "0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948";

/**
 * Minimal RitualWallet ABI for depositing lockDuration-settled funds.
 */
const RITUAL_WALLET_ABI = [
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "lockDuration", type: "uint256" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  // On testnet, use the real TEE verifier (0x0 = fallback, verify by attestation length)
  const teeVerifier = process.env.TEE_VERIFIER_ADDRESS ?? "0x0000000000000000000000000000000000000000";
  const chainId = hre.network.config.chainId ?? "unknown";
  const explorerUrl = process.env.RITUAL_EXPLORER_URL ?? "https://explorer.ritualfoundation.org/";

  console.log(`\n📦 Deploying to chain ${chainId} from ${deployer.account.address}`);

  // ---- 1. Deploy contracts ------------------------------------------------

  const agentReputation = await hre.viem.deployContract("AgentReputation", []);
  console.log(`  ✅ AgentReputation: ${agentReputation.address}`);

  const hivemindCore = await hre.viem.deployContract("HivemindCore", [
    agentReputation.address,
  ]);
  console.log(`  ✅ HivemindCore:   ${hivemindCore.address}`);

  const swarmExecution = await hre.viem.deployContract("SwarmExecution", [
    hivemindCore.address,
    agentReputation.address,
    teeVerifier,
  ]);
  console.log(`  ✅ SwarmExecution: ${swarmExecution.address}`);

  // ---- 2. Wire authorization ----------------------------------------------

  await agentReputation.write.setAuthorizedCaller([hivemindCore.address, true]);
  await agentReputation.write.setAuthorizedCaller([swarmExecution.address, true]);
  await hivemindCore.write.setAuthorizedExecutor([swarmExecution.address, true]);
  console.log(`  ✅ Authorization wiring complete`);

  // ---- 3. Fund RitualWallet for async precompile fees ---------------------

  let walletFunded = false;
  if (chainId === 1979) {
    try {
      const currentBalance = await publicClient.readContract({
        address: RITUAL_WALLET,
        abi: RITUAL_WALLET_ABI,
        functionName: "balanceOf",
        args: [deployer.account.address],
      });

      // Deposit 0.001 ETH if balance is low (no lock duration = unlocked)
      if (currentBalance < 1000000000000000n) {
        // < 0.001 ETH
        const depositAmount = 10000000000000000n; // 0.01 ETH
        const hash = await deployer.writeContract({
          address: RITUAL_WALLET,
          abi: RITUAL_WALLET_ABI,
          functionName: "deposit",
          args: [0n],
          value: depositAmount,
        });
        console.log(`  ✅ RitualWallet funded: ${depositAmount} wei (tx: ${hash})`);
        walletFunded = true;
      } else {
        console.log(`  ✅ RitualWallet balance sufficient: ${currentBalance}`);
        walletFunded = true;
      }
    } catch (e: any) {
      console.warn(`  ⚠️  Could not fund RitualWallet: ${e.message ?? e}`);
      console.warn(`     LLM precompile calls will fail until funded manually.`);
    }
  }

  // ---- 4. Save deployment record ------------------------------------------

  const record: DeploymentRecord = {
    chainId: String(chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.account.address,
    teeVerifier,
    agentReputation: agentReputation.address,
    hivemindCore: hivemindCore.address,
    swarmExecution: swarmExecution.address,
    ritualWallet: RITUAL_WALLET,
    ritualWalletFunded: walletFunded,
    explorerUrl,
  };

  const outDir = path.resolve("deployments");
  await mkdir(outDir, { recursive: true });
  await writeFile(
    path.join(outDir, `ritual.json`),
    `${JSON.stringify(record, null, 2)}\n`,
    "utf8",
  );

  console.log(`\n📄 Deployment record saved to deployments/ritual.json`);
  console.log(`\n📊 SUMMARY`);
  console.table(record);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
