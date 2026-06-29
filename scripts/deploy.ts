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
};

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const teeVerifier = process.env.TEE_VERIFIER_ADDRESS ?? "0x0000000000000000000000000000000000000000";
  const chainId = hre.network.config.chainId ?? "unknown";

  const agentReputation = await hre.viem.deployContract("AgentReputation", []);
  const hivemindCore = await hre.viem.deployContract("HivemindCore", [agentReputation.address]);
  const swarmExecution = await hre.viem.deployContract("SwarmExecution", [
    hivemindCore.address,
    agentReputation.address,
    teeVerifier,
  ]);

  await agentReputation.write.setAuthorizedCaller([swarmExecution.address, true]);
  await hivemindCore.write.setAuthorizedExecutor([swarmExecution.address, true]);

  const record: DeploymentRecord = {
    chainId: String(chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.account.address,
    teeVerifier,
    agentReputation: agentReputation.address,
    hivemindCore: hivemindCore.address,
    swarmExecution: swarmExecution.address,
  };

  const outDir = path.resolve("deployments");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "ritual.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8");

  console.log("Deployment complete");
  console.table(record);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
