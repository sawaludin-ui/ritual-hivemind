import type { Abi } from './types.js';

export const HivemindCoreAbi: Abi = [
  // Events
  {
    type: 'event',
    name: 'AgentRegistered',
    inputs: [
      { name: 'wallet', type: 'address', indexed: true, internalType: 'address' },
      { name: 'name', type: 'string', indexed: false, internalType: 'string' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TaskCreated',
    inputs: [
      { name: 'taskId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'creator', type: 'address', indexed: true, internalType: 'address' },
      { name: 'bounty', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TaskClaimed',
    inputs: [
      { name: 'taskId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'agent', type: 'address', indexed: true, internalType: 'address' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TaskStatusUpdated',
    inputs: [
      { name: 'taskId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'status', type: 'uint8', indexed: false, internalType: 'uint8' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'BountyReleased',
    inputs: [
      { name: 'taskId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'totalBounty', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'recipients', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  // Functions needed by indexer
  {
    type: 'function',
    name: 'getTask',
    inputs: [{ name: 'taskId', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      { name: 'id', type: 'uint256', internalType: 'uint256' },
      { name: 'creator', type: 'address', internalType: 'address' },
      { name: 'prompt', type: 'string', internalType: 'string' },
      { name: 'bounty', type: 'uint256', internalType: 'uint256' },
      { name: 'minAgents', type: 'uint8', internalType: 'uint8' },
      { name: 'maxAgents', type: 'uint8', internalType: 'uint8' },
      { name: 'minSubmissions', type: 'uint8', internalType: 'uint8' },
      { name: 'deadline', type: 'uint64', internalType: 'uint64' },
      { name: 'status', type: 'uint8', internalType: 'uint8' },
      { name: 'claimedAgents', type: 'address[]', internalType: 'address[]' },
      { name: 'synthesisId', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAgent',
    inputs: [{ name: 'wallet', type: 'address', internalType: 'address' }],
    outputs: [
      { name: 'agentWallet', type: 'address', internalType: 'address' },
      { name: 'name', type: 'string', internalType: 'string' },
      { name: 'capabilities', type: 'string[]', internalType: 'string[]' },
      { name: 'reputation', type: 'uint256', internalType: 'uint256' },
      { name: 'tasksCompleted', type: 'uint256', internalType: 'uint256' },
      { name: 'totalEarned', type: 'uint256', internalType: 'uint256' },
      { name: 'active', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'taskCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'markTaskStatus',
    inputs: [
      { name: 'taskId', type: 'uint256', internalType: 'uint256' },
      { name: 'status', type: 'uint8', internalType: 'uint8' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

export const SwarmExecutionAbi: Abi = [
  // Events
  {
    type: 'event',
    name: 'AnswerSubmitted',
    inputs: [
      { name: 'submissionId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'taskId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'agent', type: 'address', indexed: true, internalType: 'address' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SubmissionVerified',
    inputs: [
      { name: 'submissionId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'verified', type: 'bool', indexed: false, internalType: 'bool' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SynthesisComplete',
    inputs: [
      { name: 'taskId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'synthesizer', type: 'address', indexed: true, internalType: 'address' },
      { name: 'consensusScore', type: 'uint8', indexed: false, internalType: 'uint8' },
    ],
    anonymous: false,
  },
  // Functions
  {
    type: 'function',
    name: 'getSubmissions',
    inputs: [{ name: 'taskId', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      {
        type: 'tuple[]',
        name: 'submissions',
        components: [
          { name: 'id', type: 'uint256', internalType: 'uint256' },
          { name: 'taskId', type: 'uint256', internalType: 'uint256' },
          { name: 'agent', type: 'address', internalType: 'address' },
          { name: 'answer', type: 'string', internalType: 'string' },
          { name: 'teeAttestation', type: 'bytes', internalType: 'bytes' },
          { name: 'timestamp', type: 'uint64', internalType: 'uint64' },
          { name: 'verified', type: 'bool', internalType: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getSynthesis',
    inputs: [{ name: 'taskId', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        name: '',
        components: [
          { name: 'taskId', type: 'uint256', internalType: 'uint256' },
          { name: 'synthesizer', type: 'address', internalType: 'address' },
          { name: 'consensusReport', type: 'string', internalType: 'string' },
          { name: 'consensusScore', type: 'uint8', internalType: 'uint8' },
          { name: 'contributors', type: 'address[]', internalType: 'address[]' },
          { name: 'dissents', type: 'string[]', internalType: 'string[]' },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const;

export const AgentReputationAbi: Abi = [
  // Events
  {
    type: 'event',
    name: 'ReputationUpdated',
    inputs: [
      { name: 'agent', type: 'address', indexed: true, internalType: 'address' },
      { name: 'delta', type: 'int256', indexed: false, internalType: 'int256' },
      { name: 'newReputation', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'BountyDistributed',
    inputs: [
      { name: 'taskId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'totalBounty', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'recipients', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RewardRecorded',
    inputs: [
      { name: 'agent', type: 'address', indexed: true, internalType: 'address' },
      { name: 'payout', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'cumulativeEarned', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  // Functions
  {
    type: 'function',
    name: 'getLeaderboard',
    inputs: [{ name: 'limit', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      { name: 'agents', type: 'address[]', internalType: 'address[]' },
      { name: 'reputations', type: 'uint256[]', internalType: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getReputation',
    inputs: [{ name: 'agent', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAgentTotals',
    inputs: [{ name: 'agent', type: 'address', internalType: 'address' }],
    outputs: [
      { name: 'reputation', type: 'uint256', internalType: 'uint256' },
      { name: 'tasksCompleted', type: 'uint256', internalType: 'uint256' },
      { name: 'totalEarned', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const;

const TASK_STATUS_LABELS = ['Open', 'Executing', 'Synthesizing', 'Complete', 'Failed'] as const;

export const TASK_STATUS_MAP: Record<number, string> = {};
for (let i = 0; i < TASK_STATUS_LABELS.length; i++) {
  TASK_STATUS_MAP[i] = TASK_STATUS_LABELS[i];
}
