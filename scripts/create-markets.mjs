import { readFile } from "node:fs/promises";
import path from "node:path";
import { createWalletClient, createPublicClient, http, defineChain, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

/**
 * Create World Cup 2026 Round-of-32 prediction markets on Ritual testnet.
 *
 * Usage:
 *   node scripts/create-markets.mjs
 *
 * Reads matchups from MATCHES below. Edit MATCHES with real fixtures as they
 * are confirmed. deadline is informational (chain uses ms timestamps).
 */

const ritual = defineChain({
  id: 1979,
  name: "Ritual Testnet",
  nativeCurrency: { name: "RITUAL", symbol: "RITUAL", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.ritualfoundation.org"] } },
});

// Round of 32 sample matchups. Replace teamA/teamB with confirmed fixtures.
// kickoffMs = match kick-off in ms since epoch (Ritual-native unit).
const MATCHES = [
  { teamA: "Brazil", teamB: "South Korea", kickoffMs: Date.now() + 86_400_000 },
  { teamA: "Argentina", teamB: "Australia", kickoffMs: Date.now() + 90_000_000 },
  { teamA: "France", teamB: "Senegal", kickoffMs: Date.now() + 100_000_000 },
  { teamA: "Spain", teamB: "Morocco", kickoffMs: Date.now() + 110_000_000 },
];

async function main() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY missing in .env");
  const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);

  const publicClient = createPublicClient({ chain: ritual, transport: http() });
  const walletClient = createWalletClient({ account, chain: ritual, transport: http() });

  const dep = JSON.parse(await readFile(path.resolve("deployments/predix.json"), "utf8"));
  const address = dep.predictionMarket;
  console.log(`\n🎲 Creating markets on PredictionMarket ${address}`);

  const artifact = JSON.parse(
    await readFile(path.resolve("artifacts/contracts/PredictionMarket.sol/PredictionMarket.json"), "utf8"),
  );

  const before = await publicClient.readContract({
    address, abi: artifact.abi, functionName: "marketCount",
  });
  console.log(`   Existing markets: ${before}`);

  for (const m of MATCHES) {
    const question = `${m.teamA} vs ${m.teamB} — Who wins?`;
    console.log(`\n   Creating: ${question}`);
    const hash = await walletClient.writeContract({
      address,
      abi: artifact.abi,
      functionName: "createMarket",
      args: [question, m.teamA, m.teamB, BigInt(m.kickoffMs)],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`   ✅ tx ${hash} (block ${receipt.blockNumber})`);
  }

  const after = await publicClient.readContract({
    address, abi: artifact.abi, functionName: "marketCount",
  });
  console.log(`\n📊 Total markets now: ${after} (+${Number(after) - Number(before)})`);

  // Print all market summaries
  const ids = await publicClient.readContract({
    address, abi: artifact.abi, functionName: "getMarketIds",
  });
  console.log(`\n   Market list:`);
  for (const id of ids) {
    const mk = await publicClient.readContract({
      address, abi: artifact.abi, functionName: "getMarket", args: [id],
    });
    console.log(`   #${mk.id}: ${mk.question} [status=${mk.status}]`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
