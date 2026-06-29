import { readFileSync } from 'fs';
import { resolve } from 'path';

// Manual .env loader (no dotenv dependency needed)
function loadEnv(): void {
  const envPath = resolve(import.meta.dirname, '../.env');
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env file not found, use defaults
  }
}

loadEnv();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  rpcUrl: process.env.RPC_URL || 'https://rpc.ritualfoundation.org',
  chainId: parseInt(process.env.CHAIN_ID || '1979', 10),
  wsRpcUrl: process.env.WS_RPC_URL || 'wss://rpc.ritualfoundation.org/ws',
  hiveCoreAddress: (process.env.HIVE_CORE_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  swarmExecutionAddress: (process.env.SWARM_EXECUTION_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  agentReputationAddress: (process.env.AGENT_REPUTATION_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  startBlock: parseInt(process.env.START_BLOCK || '0', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
} as const;
