import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createWalletClient, createPublicClient, http, defineChain, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

/**
 * Deploy PredictionMarket to Ritual testnet using raw viem (the pattern that
 * reliably works on Ritual, mirroring scripts/test-e2e.ts).
 *
 * Run: node --import tsx scripts/deploy-predix.mts
 *  or: npx tsx scripts/deploy-predix.mts
 */

const ritual = defineChain({
  id: 1979,
  name: "Ritual Testnet",
  nativeCurrency: { name: "RITUAL", symbol: "RITUAL", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.ritualfoundation.org"] } },
});

async function main() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY missing in .env");
  const account = privateKeyToAccount(pk.startsWith("0x") ? (pk) : (`0x${pk}`));

  const publicClient = createPublicClient({ chain: ritual, transport: http() });
  const walletClient = createWalletClient({ account, chain: ritual, transport: http() });

  console.log(`\n🎲 Deploying RITUAL PREDIX to Ritual testnet (1979)`);
  console.log(`   Deployer / feeCollector: ${account.address}`);

  const bal = await publicClient.getBalance({ address: account.address });
  console.log(`   Balance: ${Number(bal) / 1e18} RITUAL`);

  const artifactPath = path.resolve("artifacts/contracts/PredictionMarket.sol/PredictionMarket.json");
  const artifact = JSON.parse(await readFile(artifactPath, "utf8"));

  console.log(`   Deploying...`);
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [account.address], // feeCollector = deployer
  });
  console.log(`   Tx: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const address = receipt.contractAddress;
  if (!address) throw new Error("No contract address in receipt");
  console.log(`  ✅ PredictionMarket: ${address}`);

  // Verify by reading back
  const market = getContract({ address, abi: artifact.abi, client: publicClient });
  const feeCollector = await market.read.feeCollector();
  const betFee = await market.read.betFeeBps();
  const exitFee = await market.read.exitFeeBps();
  console.log(`  ✅ feeCollector: ${feeCollector}`);
  console.log(`  ✅ betFee: ${betFee} bps | exitFee: ${exitFee} bps`);

  const record = {
    chainId: "1979",
    deployedAt: new Date().toISOString(),
    deployer: account.address,
    feeCollector,
    predictionMarket: address,
    betFeeBps: String(betFee),
    exitFeeBps: String(exitFee),
    deployTx: hash,
    explorerUrl: "https://explorer.ritualfoundation.org/",
  };

  await mkdir(path.resolve("deployments"), { recursive: true });
  await writeFile(path.resolve("deployments/predix.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8");
  console.log(`\n📄 Saved to deployments/predix.json`);
  console.table(record);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

