// Deployed on Ritual testnet (chain 1979) — Sprint 2 deployment
export const HIVE_CORE_ADDRESS = "0xa5284207c3DA247D2c986c8434d6c0336Aa7d725" as const;
export const SWARM_EXECUTION_ADDRESS = "0x937B181538Bd5dFDA8FFe62D82652CC4129F8F08" as const;
export const AGENT_REPUTATION_ADDRESS = "0x884132e3bFC2c8A64f2f5DF32be0512b0B903D49" as const;

export const HIVE_CORE_ABI = [
  { type: "function", name: "registerAgent", inputs: [{ name: "name", type: "string" }, { name: "capabilities", type: "string[]" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "createTask", inputs: [{ name: "prompt", type: "string" }, { name: "minAgents", type: "uint8" }, { name: "maxAgents", type: "uint8" }, { name: "minSubmissions", type: "uint8" }, { name: "deadline", type: "uint64" }], outputs: [{ name: "taskId", type: "uint256" }], stateMutability: "payable" },
  { type: "function", name: "claimTask", inputs: [{ name: "taskId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getTask", inputs: [{ name: "taskId", type: "uint256" }], outputs: [{ name: "id", type: "uint256" }, { name: "creator", type: "address" }, { name: "prompt", type: "string" }, { name: "bounty", type: "uint256" }, { name: "minAgents", type: "uint8" }, { name: "maxAgents", type: "uint8" }, { name: "minSubmissions", type: "uint8" }, { name: "deadline", type: "uint64" }, { name: "status", type: "uint8" }, { name: "claimedAgents", type: "address[]" }, { name: "synthesisId", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getAgent", inputs: [{ name: "wallet", type: "address" }], outputs: [{ name: "agentWallet", type: "address" }, { name: "name", type: "string" }, { name: "capabilities", type: "string[]" }, { name: "reputation", type: "uint256" }, { name: "tasksCompleted", type: "uint256" }, { name: "totalEarned", type: "uint256" }, { name: "active", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "getOpenTasks", inputs: [], outputs: [{ name: "openTaskIds", type: "uint256[]" }], stateMutability: "view" },
  { type: "function", name: "taskCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "markTaskStatus", inputs: [{ name: "taskId", type: "uint256" }, { name: "status", type: "uint8" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "releaseBounty", inputs: [{ name: "taskId", type: "uint256" }, { name: "recipients", type: "address[]" }, { name: "amounts", type: "uint256[]" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "authorizedExecutors", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "event", name: "AgentRegistered", inputs: [{ name: "wallet", type: "address", indexed: true }, { name: "name", type: "string", indexed: false }] },
  { type: "event", name: "TaskCreated", inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "creator", type: "address", indexed: true }, { name: "bounty", type: "uint256", indexed: false }] },
  { type: "event", name: "TaskClaimed", inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "agent", type: "address", indexed: true }] },
  { type: "event", name: "TaskStatusUpdated", inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "status", type: "uint8", indexed: false }] },
  { type: "event", name: "BountyReleased", inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "totalBounty", type: "uint256", indexed: false }, { name: "recipients", type: "uint256", indexed: false }] },
  { type: "error", name: "AgentAlreadyRegistered", inputs: [] },
  { type: "error", name: "AgentNotRegistered", inputs: [] },
  { type: "error", name: "TaskNotFound", inputs: [] },
  { type: "error", name: "TaskNotOpen", inputs: [] },
  { type: "error", name: "TaskExpired", inputs: [] },
  { type: "error", name: "TaskFull", inputs: [] },
  { type: "error", name: "AlreadyClaimed", inputs: [] },
  { type: "error", name: "InvalidBounty", inputs: [] },
  { type: "error", name: "InvalidTaskWindow", inputs: [] },
  { type: "error", name: "NotAuthorizedExecutor", inputs: [] },
] as const;

export const SWARM_EXECUTION_ABI = [
  { type: "function", name: "submitAnswer", inputs: [{ name: "taskId", type: "uint256" }, { name: "answer", type: "string" }, { name: "teeAttestation", type: "bytes" }], outputs: [{ name: "submissionId", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "synthesize", inputs: [{ name: "taskId", type: "uint256" }, { name: "llmPayload", type: "bytes" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getSubmissions", inputs: [{ name: "taskId", type: "uint256" }], outputs: [{ name: "submissions", type: "tuple[]", components: [{ name: "id", type: "uint256" }, { name: "taskId", type: "uint256" }, { name: "agent", type: "address" }, { name: "answer", type: "string" }, { name: "teeAttestation", type: "bytes" }, { name: "timestamp", type: "uint64" }, { name: "verified", type: "bool" }] }], stateMutability: "view" },
  { type: "function", name: "getSynthesis", inputs: [{ name: "taskId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "taskId", type: "uint256" }, { name: "synthesizer", type: "address" }, { name: "consensusReport", type: "string" }, { name: "consensusScore", type: "uint8" }, { name: "contributors", type: "address[]" }, { name: "dissents", type: "string[]" }] }], stateMutability: "view" },
  { type: "event", name: "AnswerSubmitted", inputs: [{ name: "submissionId", type: "uint256", indexed: true }, { name: "taskId", type: "uint256", indexed: true }, { name: "agent", type: "address", indexed: true }] },
  { type: "event", name: "SubmissionVerified", inputs: [{ name: "submissionId", type: "uint256", indexed: true }, { name: "verified", type: "bool", indexed: false }] },
  { type: "event", name: "SynthesisComplete", inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "synthesizer", type: "address", indexed: true }, { name: "consensusScore", type: "uint8", indexed: false }] },
  { type: "error", name: "TaskClosed", inputs: [] },
  { type: "error", name: "AgentNotClaimed", inputs: [] },
  { type: "error", name: "AlreadySubmitted", inputs: [] },
  { type: "error", name: "NotEnoughVerifiedSubmissions", inputs: [] },
  { type: "error", name: "SubmissionNotFound", inputs: [] },
] as const;

export const AGENT_REPUTATION_ABI = [
  { type: "function", name: "updateReputation", inputs: [{ name: "agent", type: "address" }, { name: "delta", type: "int256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "distributeBounty", inputs: [{ name: "taskId", type: "uint256" }, { name: "contributors", type: "address[]" }, { name: "weights", type: "uint256[]" }, { name: "totalBounty", type: "uint256" }], outputs: [{ name: "payouts", type: "uint256[]" }], stateMutability: "nonpayable" },
  { type: "function", name: "getLeaderboard", inputs: [{ name: "limit", type: "uint256" }], outputs: [{ name: "agents", type: "address[]" }, { name: "reputations", type: "uint256[]" }], stateMutability: "view" },
  { type: "function", name: "getReputation", inputs: [{ name: "agent", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getAgentTotals", inputs: [{ name: "agent", type: "address" }], outputs: [{ name: "reputation", type: "uint256" }, { name: "tasksCompleted", type: "uint256" }, { name: "totalEarned", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "knownAgents", inputs: [], outputs: [{ name: "", type: "address[]" }], stateMutability: "view" },
] as const;

export const TASK_STATUS = { 0: "Open", 1: "Executing", 2: "Synthesizing", 3: "Complete", 4: "Failed" } as const;

// Alias for pages that import HIVEMIND_CORE_* names.
export const HIVEMIND_CORE_ADDRESS = HIVE_CORE_ADDRESS;
export const HIVEMIND_CORE_ABI = HIVE_CORE_ABI;
export const SWARM_ABI = SWARM_EXECUTION_ABI;
export const REPUTATION_ABI = AGENT_REPUTATION_ABI;
