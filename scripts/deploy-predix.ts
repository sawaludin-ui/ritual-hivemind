import hre from "hardhat";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Deploy PredictionMarket (Ritual Predix) to Ritual testnet.
 *
 * feeCollector = deployer wallet (Dimas) → all protocol fees flow here.
 * Merges into deployments/predix.json without touching the Hivemind record.
 */
async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const chainId = hre.network.config.chainId ?? "unknown";
  const explorerUrl = process.env.RITUAL_EXPLORER_URL ?? "https://explorer.ritualfoundation.org/";

  console.log(`\n🎲 Deploying RITUAL PREDIX to chain ${chainId}`);
  console.log(`   Deployer / feeCollector: ${deployer.account.address}`);

  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log(`   Balance: ${Number(balance) / 1e18} RITUAL`);

  // feeCollector = deployer (Dimas gets the fees)
  const market = await hre.viem.deployContract("PredictionMarket", [
    deployer.account.address,
  ]);
  console.log(`  ✅ PredictionMarket: ${market.address}`);

  // Verify the deployment by reading back state
  const feeCollector = await market.read.feeCollector();
  const betFee = await market.read.betFeeBps();
  const exitFee = await market.read.exitFeeBps();
  console.log(`  ✅ feeCollector: ${feeCollector}`);
  console.log(`  ✅ betFee: ${betFee} bps | exitFee: ${exitFee} bps`);

  const record = {
    chainId: String(chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.account.address,
    feeCollector,
    predictionMarket: market.address,
    betFeeBps: String(betFee),
    exitFeeBps: String(exitFee),
    explorerUrl,
  };

  const outDir = path.resolve("deployments");
  await mkdir(outDir, { recursive: true });
  await writeFile(
    path.join(outDir, "predix.json"),
    `${JSON.stringify(record, null, 2)}\n`,
    "utf8",
  );

  console.log(`\n📄 Saved to deployments/predix.json`);
  console.table(record);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
