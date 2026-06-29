import { network } from "hardhat";
import type { GetContractReturnType } from "@nomicfoundation/hardhat-viem/types";

/**
 * Shared test harness for the Ritual Hivemind contract suite.
 *
 * Deploys the full contract graph (AgentReputation -> HivemindCore -> SwarmExecution)
 * and wires authorization exactly like scripts/deploy.ts, so unit tests exercise the
 * same topology that ships to the Ritual testnet.
 */
export async function deployHivemind() {
  const connection = await network.create();
  const { viem } = connection;

  const [deployer, alice, bob, carol, dave] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  // 1. Reputation ledger (single source of truth for rep/earnings).
  const reputation = await viem.deployContract("AgentReputation", []);

  // 2. Core registry. Needs the reputation address to read agent totals.
  const core = await viem.deployContract("HivemindCore", [reputation.address]);

  // 3. Mock TEE verifier for deterministic local verification.
  const teeVerifier = await viem.deployContract("MockTeeVerifier", []);

  // 4. Swarm execution engine, wired to all three.
  const swarm = await viem.deployContract("SwarmExecution", [
    core.address,
    reputation.address,
    teeVerifier.address,
  ]);

  // Authorization wiring (mirrors deploy.ts).
  // - Reputation accepts updates from both core (register init) and swarm (synthesis).
  // - Core accepts status/bounty calls from the swarm engine.
  await reputation.write.setAuthorizedCaller([core.address, true]);
  await reputation.write.setAuthorizedCaller([swarm.address, true]);
  await core.write.setAuthorizedExecutor([swarm.address, true]);

  return {
    connection,
    viem,
    publicClient,
    deployer,
    alice,
    bob,
    carol,
    dave,
    reputation,
    core,
    teeVerifier,
    swarm,
  };
}

export type HivemindFixture = Awaited<ReturnType<typeof deployHivemind>>;

/** A non-zero TEE attestation blob accepted by MockTeeVerifier. */
export const VALID_ATTESTATION = "0x01" as const;

/** Empty attestation — rejected by MockTeeVerifier (length 0). */
export const EMPTY_ATTESTATION = "0x" as const;

/** Returns a deadline `secs` seconds in the future relative to the latest block. */
export async function futureDeadline(
  fixture: HivemindFixture,
  secs: bigint = 3600n,
): Promise<bigint> {
  const block = await fixture.publicClient.getBlock();
  return block.timestamp + secs;
}

/** Connects a deployed contract instance to a specific wallet (sender). */
export async function as<T extends GetContractReturnType>(
  fixture: HivemindFixture,
  contractName: string,
  address: `0x${string}`,
  account: `0x${string}`,
): Promise<T> {
  return (await fixture.viem.getContractAt(contractName, address, {
    client: { wallet: await walletFor(fixture, account) },
  })) as unknown as T;
}

async function walletFor(fixture: HivemindFixture, account: `0x${string}`) {
  const clients = await fixture.viem.getWalletClients();
  const found = clients.find(
    (c) => c.account.address.toLowerCase() === account.toLowerCase(),
  );
  if (!found) throw new Error(`No wallet client for ${account}`);
  return found;
}
