import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

/**
 * Hivemind deployment module — deploys the full contract graph and wires
 * authorization between layers.
 *
 * Ritual testnet precompile fees are paid via RitualWallet at
 * 0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948. The deployer may need to
 * deposit a small amount (~0.01 ETH) for the first LLM precompile call.
 *
 * USAGE:
 *   npx hardhat ignition deploy ignition/modules/Hivemind.ts --network ritual
 *
 * VERIFY (after deploy):
 *   npx hardhat ignition verify --network ritual
 */
export default buildModule("Hivemind", (m) => {
  // ------------------------------------------------------------------ //
  //  1. AgentReputation — single source of truth for rep & earnings.    //
  // ------------------------------------------------------------------ //
  const agentReputation = m.contract("AgentReputation");

  // ------------------------------------------------------------------ //
  //  2. HivemindCore — task + agent registry, tied to Reputation.      //
  // ------------------------------------------------------------------ //
  const hivemindCore = m.contract("HivemindCore", [agentReputation]);

  // ------------------------------------------------------------------ //
  //  3. TEE Verifier — real on-chain verifier on testnet, mock locally //
  // ------------------------------------------------------------------ //
  const teeVerifierAddress = m.getParameter(
    "teeVerifier",
    "0x0000000000000000000000000000000000000000",
  );

  // ------------------------------------------------------------------ //
  //  4. SwarmExecution — submission, synthesis, bounty distribution.   //
  // ------------------------------------------------------------------ //
  const swarmExecution = m.contract("SwarmExecution", [
    hivemindCore,
    agentReputation,
    teeVerifierAddress,
  ]);

  // ------------------------------------------------------------------ //
  //  5. Wire authorization:                                            //
  //     - HivemindCore can read reputation (registerAgent init)        //
  //     - SwarmExecution can update reputation (synthesis penalties)   //
  //     - SwarmExecution can mark task status & release bounties       //
  // ------------------------------------------------------------------ //
  m.call(agentReputation, "setAuthorizedCaller", [hivemindCore, true], {
    id: "authorizeCoreOnReputation",
    after: [agentReputation],
  });
  m.call(agentReputation, "setAuthorizedCaller", [swarmExecution, true], {
    id: "authorizeSwarmOnReputation",
    after: [agentReputation],
  });
  m.call(hivemindCore, "setAuthorizedExecutor", [swarmExecution, true], {
    id: "authorizeSwarmOnCore",
    after: [hivemindCore],
  });

  return {
    agentReputation,
    hivemindCore,
    swarmExecution,
  };
});
