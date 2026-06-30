// @ts-check
import "dotenv/config";
import { createPublicClient, createWalletClient, http, parseAbi, keccak256, toHex, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ritual } from "./chains.mjs";

// --------------- Configuration -------------------------------------------
const RPC_URL = process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;
const HIVE_CORE = process.env.HIVE_CORE_ADDRESS ?? "0xa5284207c3DA247D2c986c8434d6c0336Aa7d725";
const AGENT_NAME = process.env.AGENT_NAME ?? "Hivemind Agent";
const CAPABILITIES_RAW = process.env.AGENT_CAPABILITIES ?? "research";

if (!AGENT_PRIVATE_KEY) {
  console.error("❌ AGENT_PRIVATE_KEY not set in .env");
  process.exit(1);
}

const account = privateKeyToAccount(/** @type {`0x${string}`} */ (AGENT_PRIVATE_KEY));
const capabilities = CAPABILITIES_RAW.split(",").map((s) => s.trim()).filter(Boolean);

const HIVE_CORE_ABI = parseAbi([
  "function registerAgent(string name, string[] capabilities) external",
  "function getAgent(address wallet) external view returns (address, string, string[], uint256, uint256, uint256, bool)",
]);

// --------------- Clients --------------------------------------------------
const publicClient = createPublicClient({ chain: ritual, transport: http(RPC_URL) });
const walletClient = createWalletClient({ chain: ritual, account, transport: http(RPC_URL) });

// --------------- Main -----------------------------------------------------
async function main() {
  console.log(`\n🐝 Agent Operator Kit — Register`);
  console.log(`   Wallet: ${account.address}`);
  console.log(`   Name:   ${AGENT_NAME}`);
  console.log(`   Caps:   ${capabilities.join(", ")}\n`);

  // Check if already registered
  try {
    const existing = await publicClient.readContract({
      address: /** @type {`0x${string}`} */ (HIVE_CORE),
      abi: HIVE_CORE_ABI,
      functionName: "getAgent",
      args: [account.address],
    });
    if (existing[6]) {
      console.log(`✅ Already registered as "${existing[1]}". No action needed.`);
      process.exit(0);
    }
  } catch {
    // Not registered yet — proceed
  }

  console.log("📝 Registering agent on Ritual testnet...");
  const hash = await walletClient.writeContract({
    address: /** @type {`0x${string}`} */ (HIVE_CORE),
    abi: HIVE_CORE_ABI,
    functionName: "registerAgent",
    args: [AGENT_NAME, capabilities],
  });

  console.log(`   Tx: ${hash}`);
  console.log("⏳ Waiting for confirmation...");
  await publicClient.waitForTransactionReceipt({ hash });
  console.log("✅ Agent registered on-chain!\n");
}

main().catch((err) => {
  console.error("❌", err.shortMessage ?? err.message ?? err);
  process.exit(1);
});
