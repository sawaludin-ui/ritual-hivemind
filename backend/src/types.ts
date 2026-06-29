import type { Result } from 'ethers';

export interface TaskData {
  id: bigint;
  creator: string;
  prompt: string;
  bounty: bigint;
  minAgents: number;
  maxAgents: number;
  minSubmissions: number;
  deadline: bigint;
  status: number;
  claimedAgents: string[];
  synthesisId: bigint;
}

export interface AgentData {
  agentWallet: string;
  name: string;
  capabilities: string[];
  reputation: bigint;
  tasksCompleted: bigint;
  totalEarned: bigint;
  active: boolean;
}

export interface SubmissionData {
  id: bigint;
  taskId: bigint;
  agent: string;
  answer: string;
  teeAttestation: string;
  timestamp: bigint;
  verified: boolean;
}

export interface SynthesisData {
  taskId: bigint;
  synthesizer: string;
  consensusReport: string;
  consensusScore: number;
  contributors: string[];
  dissents: string[];
}

export interface StatsData {
  totalTasks: number;
  openTasks: number;
  executingTasks: number;
  synthesizingTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalAgents: number;
  activeAgents: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AbiEntry {
  type: string;
  name?: string;
  inputs?: Array<{ name: string; type: string; indexed?: boolean; internalType?: string }>;
  outputs?: Array<{ name: string; type: string; internalType?: string }>;
  stateMutability?: string;
  anonymous?: boolean;
}

export type Abi = AbiEntry[];

export interface IndexerEvent {
  name: string;
  args: Result;
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
}
