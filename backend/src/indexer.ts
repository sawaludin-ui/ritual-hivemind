import { ethers } from 'ethers';
import { db } from './db.js';
import { config } from './config.js';
import { HivemindCoreAbi, SwarmExecutionAbi, AgentReputationAbi, TASK_STATUS_MAP } from './abis.js';
import type { IndexerEvent } from './types.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type EventHandler = (event: IndexerEvent) => Promise<void>;

export class EventIndexer {
  private provider!: ethers.JsonRpcProvider;
  private wsProvider: ethers.WebSocketProvider | null = null;
  private hiveCore!: ethers.Contract;
  private swarmExecution!: ethers.Contract;
  private agentReputation!: ethers.Contract;
  private running = false;
  private lastProcessedBlock: bigint = BigInt(config.startBlock);
  private broadcastCallback: ((eventName: string, data: unknown) => void) | null = null;

  constructor() {
    this.initProvider();
  }

  private initProvider(): void {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId, {
      staticNetwork: true,
    });

    this.hiveCore = new ethers.Contract(config.hiveCoreAddress, HivemindCoreAbi, this.provider);
    this.swarmExecution = new ethers.Contract(config.swarmExecutionAddress, SwarmExecutionAbi, this.provider);
    this.agentReputation = new ethers.Contract(config.agentReputationAddress, AgentReputationAbi, this.provider);
  }

  setBroadcastCallback(cb: (eventName: string, data: unknown) => void): void {
    this.broadcastCallback = cb;
  }

  private broadcast(eventName: string, data: unknown): void {
    if (this.broadcastCallback) {
      try {
        this.broadcastCallback(eventName, data);
      } catch {
        // ignore broadcast errors
      }
    }
  }

  async startIndexer(): Promise<void> {
    console.log('[Indexer] Starting historical indexer...');
    this.running = true;

    try {
      // Load last processed block from DB
      await this.loadLastProcessedBlock();

      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Number(this.lastProcessedBlock) + 1;

      if (fromBlock > currentBlock) {
        console.log(`[Indexer] Up to date at block ${currentBlock}`);
        return;
      }

      console.log(`[Indexer] Scanning blocks ${fromBlock} to ${currentBlock}...`);
      const chunkSize = 5000;

      for (let start = fromBlock; start <= currentBlock; start += chunkSize) {
        const end = Math.min(start + chunkSize - 1, currentBlock);
        await this.processBlockRange(start, end);
        await this.updateLastProcessedBlock(BigInt(end));
        console.log(`[Indexer] Processed blocks ${start}-${end}`);
      }

      console.log('[Indexer] Historical indexing complete');
    } catch (err) {
      console.error('[Indexer] Error during historical indexing:', err);
    }
  }

  async startLiveListener(): Promise<void> {
    console.log('[Indexer] Starting live event listener...');

    try {
      this.wsProvider = new ethers.WebSocketProvider(config.wsRpcUrl, config.chainId, {
        staticNetwork: true,
      });

      const wsHiveCore = new ethers.Contract(config.hiveCoreAddress, HivemindCoreAbi, this.wsProvider);
      const wsSwarmExecution = new ethers.Contract(config.swarmExecutionAddress, SwarmExecutionAbi, this.wsProvider);
      const wsAgentReputation = new ethers.Contract(config.agentReputationAddress, AgentReputationAbi, this.wsProvider);

      // Listen to HivemindCore events
      wsHiveCore.on('AgentRegistered', async (wallet: string, name: string, event: ethers.EventLog) => {
        await this.handleAgentRegistered({ wallet, name, blockNumber: BigInt(event.blockNumber), transactionHash: event.transactionHash, logIndex: event.index });
      });

      wsHiveCore.on('TaskCreated', async (taskId: bigint, creator: string, bounty: bigint, event: ethers.EventLog) => {
        await this.handleTaskCreated({ taskId, creator, bounty, blockNumber: BigInt(event.blockNumber), transactionHash: event.transactionHash, logIndex: event.index });
        await this.updateLastProcessedBlock(BigInt(event.blockNumber));
      });

      wsHiveCore.on('TaskClaimed', async (taskId: bigint, agent: string, event: ethers.EventLog) => {
        await this.handleTaskClaimed({ taskId, agent, blockNumber: BigInt(event.blockNumber), transactionHash: event.transactionHash, logIndex: event.index });
      });

      wsHiveCore.on('TaskStatusUpdated', async (taskId: bigint, status: number, event: ethers.EventLog) => {
        await this.handleTaskStatusUpdated({ taskId, status, blockNumber: BigInt(event.blockNumber), transactionHash: event.transactionHash, logIndex: event.index });
      });

      wsHiveCore.on('BountyReleased', async (taskId: bigint, totalBounty: bigint, recipients: bigint, event: ethers.EventLog) => {
        await this.handleBountyReleased({ taskId, totalBounty, recipients, blockNumber: BigInt(event.blockNumber), transactionHash: event.transactionHash, logIndex: event.index });
      });

      // Listen to SwarmExecution events
      wsSwarmExecution.on('AnswerSubmitted', async (submissionId: bigint, taskId: bigint, agent: string, event: ethers.EventLog) => {
        await this.handleAnswerSubmitted({ submissionId, taskId, agent, blockNumber: BigInt(event.blockNumber), transactionHash: event.transactionHash, logIndex: event.index });
      });

      wsSwarmExecution.on('SubmissionVerified', async (submissionId: bigint, verified: boolean, event: ethers.EventLog) => {
        await this.handleSubmissionVerified({ submissionId, verified, blockNumber: BigInt(event.blockNumber), transactionHash: event.transactionHash, logIndex: event.index });
      });

      wsSwarmExecution.on('SynthesisComplete', async (taskId: bigint, synthesizer: string, consensusScore: number, event: ethers.EventLog) => {
        await this.handleSynthesisComplete({ taskId, synthesizer, consensusScore, blockNumber: BigInt(event.blockNumber), transactionHash: event.transactionHash, logIndex: event.index });
      });

      // Listen to AgentReputation events
      wsAgentReputation.on('ReputationUpdated', async (agent: string, delta: bigint, newReputation: bigint, event: ethers.EventLog) => {
        await this.handleReputationUpdated({ agent, delta, newReputation, blockNumber: BigInt(event.blockNumber), transactionHash: event.transactionHash, logIndex: event.index });
      });

      wsAgentReputation.on('BountyDistributed', async (taskId: bigint, totalBounty: bigint, recipients: bigint, event: ethers.EventLog) => {
        await this.handleBountyDistributed({ taskId, totalBounty, recipients, blockNumber: BigInt(event.blockNumber), transactionHash: event.transactionHash, logIndex: event.index });
      });

      console.log('[Indexer] Live listener active');
    } catch (err) {
      console.error('[Indexer] WS connection failed, falling back to polling:', err);
      // Poll every 5 seconds as fallback
      setInterval(async () => {
        if (!this.running) return;
        try {
          const currentBlock = await this.provider.getBlockNumber();
          if (BigInt(currentBlock) > this.lastProcessedBlock) {
            const fromBlock = Number(this.lastProcessedBlock) + 1;
            await this.processBlockRange(fromBlock, currentBlock);
            await this.updateLastProcessedBlock(BigInt(currentBlock));
          }
        } catch (pollErr) {
          console.error('[Indexer] Poll error:', pollErr);
        }
      }, 5_000);
    }
  }

  private async loadLastProcessedBlock(): Promise<void> {
    try {
      const state = await db.indexerState.findUnique({ where: { key: 'lastProcessedBlock' } });
      if (state) {
        this.lastProcessedBlock = BigInt(state.value);
        console.log(`[Indexer] Resuming from block ${this.lastProcessedBlock}`);
      }
    } catch {
      // First run, start from configured startBlock
    }
  }

  private async updateLastProcessedBlock(blockNumber: bigint): Promise<void> {
    if (blockNumber <= this.lastProcessedBlock) return;
    this.lastProcessedBlock = blockNumber;

    await db.indexerState.upsert({
      where: { key: 'lastProcessedBlock' },
      create: { key: 'lastProcessedBlock', value: blockNumber.toString() },
      update: { value: blockNumber.toString() },
    });
  }

  private async processBlockRange(fromBlock: number, toBlock: number): Promise<void> {
    const filterHiveCore = {
      address: config.hiveCoreAddress,
      fromBlock,
      toBlock,
    };

    const filterSwarm = {
      address: config.swarmExecutionAddress,
      fromBlock,
      toBlock,
    };

    const filterRep = {
      address: config.agentReputationAddress,
      fromBlock,
      toBlock,
    };

    const [coreLogs, swarmLogs, repLogs] = await Promise.all([
      this.provider.getLogs({ ...filterHiveCore, topics: [] }),
      this.provider.getLogs({ ...filterSwarm, topics: [] }),
      this.provider.getLogs({ ...filterRep, topics: [] }),
    ]);

    const allLogs = [
      ...coreLogs.map(l => ({ ...l, contract: 'hiveCore' as const })),
      ...swarmLogs.map(l => ({ ...l, contract: 'swarmExecution' as const })),
      ...repLogs.map(l => ({ ...l, contract: 'agentReputation' as const })),
    ].sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) return Number(a.blockNumber - b.blockNumber);
      return a.index - b.index;
    });

    for (const log of allLogs) {
      try {
        let contract: ethers.Contract;
        let parsed: ethers.LogDescription | null = null;

        switch (log.contract) {
          case 'hiveCore':
            contract = this.hiveCore;
            parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
            break;
          case 'swarmExecution':
            contract = this.swarmExecution;
            parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
            break;
          case 'agentReputation':
            contract = this.agentReputation;
            parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
            break;
        }

        if (!parsed) continue;

        const event: IndexerEvent = {
          name: parsed.name,
          args: parsed.args,
          blockNumber: BigInt(log.blockNumber),
          transactionHash: log.transactionHash,
          logIndex: log.index,
        };

        await this.dispatchEvent(event);
      } catch (err) {
        console.error(`[Indexer] Failed to parse log at block ${log.blockNumber}:`, err);
      }
    }
  }

  private async dispatchEvent(event: IndexerEvent): Promise<void> {
    switch (event.name) {
      case 'AgentRegistered':
        await this.handleAgentRegistered({
          wallet: event.args[0] as string,
          name: event.args[1] as string,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
        });
        break;
      case 'TaskCreated':
        await this.handleTaskCreated({
          taskId: event.args[0] as bigint,
          creator: event.args[1] as string,
          bounty: event.args[2] as bigint,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
        });
        break;
      case 'TaskClaimed':
        await this.handleTaskClaimed({
          taskId: event.args[0] as bigint,
          agent: event.args[1] as string,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
        });
        break;
      case 'TaskStatusUpdated':
        await this.handleTaskStatusUpdated({
          taskId: event.args[0] as bigint,
          status: event.args[1] as number,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
        });
        break;
      case 'AnswerSubmitted':
        await this.handleAnswerSubmitted({
          submissionId: event.args[0] as bigint,
          taskId: event.args[1] as bigint,
          agent: event.args[2] as string,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
        });
        break;
      case 'SubmissionVerified':
        await this.handleSubmissionVerified({
          submissionId: event.args[0] as bigint,
          verified: event.args[1] as boolean,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
        });
        break;
      case 'SynthesisComplete':
        await this.handleSynthesisComplete({
          taskId: event.args[0] as bigint,
          synthesizer: event.args[1] as string,
          consensusScore: Number(event.args[2]),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
        });
        break;
      case 'ReputationUpdated':
        await this.handleReputationUpdated({
          agent: event.args[0] as string,
          delta: event.args[1] as bigint,
          newReputation: event.args[2] as bigint,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
        });
        break;
      case 'BountyDistributed':
        await this.handleBountyDistributed({
          taskId: event.args[0] as bigint,
          totalBounty: event.args[1] as bigint,
          recipients: event.args[2] as bigint,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
        });
        break;
      case 'BountyReleased':
        await this.handleBountyReleased({
          taskId: event.args[0] as bigint,
          totalBounty: event.args[1] as bigint,
          recipients: event.args[2] as bigint,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
        });
        break;
      default:
        console.log(`[Indexer] Unknown event: ${event.name}`);
    }
  }

  private async handleAgentRegistered(data: {
    wallet: string;
    name: string;
    blockNumber: bigint;
    transactionHash: string;
    logIndex: number;
  }): Promise<void> {
    try {
      await db.agent.upsert({
        where: { address: data.wallet.toLowerCase() },
        create: {
          address: data.wallet.toLowerCase(),
          name: data.name,
          capabilities: '[]',
          reputation: BigInt(100),
          active: true,
        },
        update: {
          name: data.name,
          active: true,
        },
      });
      this.broadcast('agent:registered', { address: data.wallet, name: data.name });
    } catch (err) {
      console.error('[Indexer] handleAgentRegistered error:', err);
    }
  }

  private async handleTaskCreated(data: {
    taskId: bigint;
    creator: string;
    bounty: bigint;
    blockNumber: bigint;
    transactionHash: string;
    logIndex: number;
  }): Promise<void> {
    try {
      // Fetch full task details from chain
      const task = await this.hiveCore.getTask(data.taskId);
      // Ritual chain may return deadline in ms or seconds; detect and normalize
      const deadlineRaw = Number(task.deadline);
      const deadline = new Date(deadlineRaw > 1000000000000 ? deadlineRaw : deadlineRaw * 1000);

      await db.task.upsert({
        where: { chainTaskId: data.taskId },
        create: {
          chainTaskId: data.taskId,
          creator: data.creator.toLowerCase(),
          prompt: task.prompt,
          bounty: data.bounty.toString(),
          minAgents: task.minAgents,
          maxAgents: task.maxAgents,
          minSubmissions: task.minSubmissions,
          deadline,
          status: TASK_STATUS_MAP[task.status] || 'Open',
          blockNumber: data.blockNumber,
          txHash: data.transactionHash,
        },
        update: {
          creator: data.creator.toLowerCase(),
          prompt: task.prompt,
          bounty: data.bounty.toString(),
          deadline,
          status: TASK_STATUS_MAP[task.status] || 'Open',
          blockNumber: data.blockNumber,
          txHash: data.transactionHash,
        },
      });

      this.broadcast('task:created', {
        chainTaskId: data.taskId.toString(),
        creator: data.creator,
        bounty: data.bounty.toString(),
      });
    } catch (err) {
      console.error('[Indexer] handleTaskCreated error:', err);
    }
  }

  private async handleTaskClaimed(data: {
    taskId: bigint;
    agent: string;
    blockNumber: bigint;
    transactionHash: string;
    logIndex: number;
  }): Promise<void> {
    try {
      // Update task status via chain data
      const task = await this.hiveCore.getTask(data.taskId);

      await db.task.update({
        where: { chainTaskId: data.taskId },
        data: {
          status: TASK_STATUS_MAP[task.status] || 'Open',
          blockNumber: data.blockNumber,
          txHash: data.transactionHash,
        },
      });

      this.broadcast('task:claimed', {
        chainTaskId: data.taskId.toString(),
        agent: data.agent,
      });
    } catch (err) {
      console.error('[Indexer] handleTaskClaimed error:', err);
    }
  }

  private async handleTaskStatusUpdated(data: {
    taskId: bigint;
    status: number;
    blockNumber: bigint;
    transactionHash: string;
    logIndex: number;
  }): Promise<void> {
    try {
      await db.task.update({
        where: { chainTaskId: data.taskId },
        data: {
          status: TASK_STATUS_MAP[data.status] || 'Unknown',
          blockNumber: data.blockNumber,
          txHash: data.transactionHash,
        },
      });

      this.broadcast('task:status', {
        chainTaskId: data.taskId.toString(),
        status: TASK_STATUS_MAP[data.status],
      });
    } catch (err) {
      console.error('[Indexer] handleTaskStatusUpdated error:', err);
    }
  }

  private async handleAnswerSubmitted(data: {
    submissionId: bigint;
    taskId: bigint;
    agent: string;
    blockNumber: bigint;
    transactionHash: string;
    logIndex: number;
  }): Promise<void> {
    try {
      const dbTask = await db.task.findUnique({ where: { chainTaskId: data.taskId } });
      if (!dbTask) {
        console.warn(`[Indexer] AnswerSubmitted for unknown task ${data.taskId}`);
        return;
      }

      const subs = await this.swarmExecution.getSubmissions(data.taskId);
      const sub = subs.find((s: { id: bigint }) => s.id === data.submissionId);
      if (!sub) {
        console.warn(`[Indexer] Submission ${data.submissionId} not found on chain`);
        return;
      }

      await db.submission.upsert({
        where: { chainSubmissionId: data.submissionId },
        create: {
          chainSubmissionId: data.submissionId,
          taskId: dbTask.id,
          agent: data.agent.toLowerCase(),
          answer: sub.answer,
          teeAttestation: sub.teeAttestation || null,
          verified: sub.verified,
          timestamp: new Date(Number(sub.timestamp) * 1000),
          blockNumber: data.blockNumber,
          txHash: data.transactionHash,
        },
        update: {
          answer: sub.answer,
          teeAttestation: sub.teeAttestation || null,
          verified: sub.verified,
          timestamp: new Date(Number(sub.timestamp) * 1000),
          blockNumber: data.blockNumber,
          txHash: data.transactionHash,
        },
      });

      this.broadcast('submission:submitted', {
        submissionId: data.submissionId.toString(),
        taskId: data.taskId.toString(),
        agent: data.agent,
      });
    } catch (err) {
      console.error('[Indexer] handleAnswerSubmitted error:', err);
    }
  }

  private async handleSubmissionVerified(data: {
    submissionId: bigint;
    verified: boolean;
    blockNumber: bigint;
    transactionHash: string;
    logIndex: number;
  }): Promise<void> {
    try {
      await db.submission.update({
        where: { chainSubmissionId: data.submissionId },
        data: { verified: data.verified },
      });

      this.broadcast('submission:verified', {
        submissionId: data.submissionId.toString(),
        verified: data.verified,
      });
    } catch (err) {
      console.error('[Indexer] handleSubmissionVerified error:', err);
    }
  }

  private async handleSynthesisComplete(data: {
    taskId: bigint;
    synthesizer: string;
    consensusScore: number;
    blockNumber: bigint;
    transactionHash: string;
    logIndex: number;
  }): Promise<void> {
    try {
      const dbTask = await db.task.findUnique({ where: { chainTaskId: data.taskId } });
      if (!dbTask) return;

      const synthesis = await this.swarmExecution.getSynthesis(data.taskId);

      await db.synthesis.upsert({
        where: { taskId: dbTask.id },
        create: {
          taskId: dbTask.id,
          consensusReport: synthesis.consensusReport,
          consensusScore: synthesis.consensusScore,
          contributors: JSON.stringify(synthesis.contributors),
          dissents: JSON.stringify(synthesis.dissents),
          blockNumber: data.blockNumber,
          txHash: data.transactionHash,
        },
        update: {
          consensusReport: synthesis.consensusReport,
          consensusScore: synthesis.consensusScore,
          contributors: JSON.stringify(synthesis.contributors),
          dissents: JSON.stringify(synthesis.dissents),
          blockNumber: data.blockNumber,
          txHash: data.transactionHash,
        },
      });

      await db.task.update({
        where: { chainTaskId: data.taskId },
        data: { status: 'Complete' },
      });

      this.broadcast('synthesis:complete', {
        taskId: data.taskId.toString(),
        synthesizer: data.synthesizer,
        consensusScore: data.consensusScore,
      });
    } catch (err) {
      console.error('[Indexer] handleSynthesisComplete error:', err);
    }
  }

  private async handleReputationUpdated(data: {
    agent: string;
    delta: bigint;
    newReputation: bigint;
    blockNumber: bigint;
    transactionHash: string;
    logIndex: number;
  }): Promise<void> {
    try {
      await db.agent.upsert({
        where: { address: data.agent.toLowerCase() },
        create: {
          address: data.agent.toLowerCase(),
          name: '',
          capabilities: '[]',
          reputation: data.newReputation,
        },
        update: {
          reputation: data.newReputation,
        },
      });

      // Also update the on-chain agent data for name/capabilities if missing
      try {
        const agentOnChain = await this.hiveCore.getAgent(data.agent);
        if (agentOnChain.name) {
          await db.agent.update({
            where: { address: data.agent.toLowerCase() },
            data: {
              name: agentOnChain.name,
              capabilities: JSON.stringify(agentOnChain.capabilities),
              tasksCompleted: Number(agentOnChain.tasksCompleted),
              active: agentOnChain.active,
            },
          });
        }
      } catch {
        // Agent not registered in HivemindCore yet — just leave basic data
      }

      this.broadcast('reputation:updated', {
        agent: data.agent,
        delta: data.delta.toString(),
        newReputation: data.newReputation.toString(),
      });
    } catch (err) {
      console.error('[Indexer] handleReputationUpdated error:', err);
    }
  }

  private async handleBountyDistributed(data: {
    taskId: bigint;
    totalBounty: bigint;
    recipients: bigint;
    blockNumber: bigint;
    transactionHash: string;
    logIndex: number;
  }): Promise<void> {
    try {
      await db.task.update({
        where: { chainTaskId: data.taskId },
        data: { status: 'Complete' },
      });

      this.broadcast('bounty:distributed', {
        taskId: data.taskId.toString(),
        totalBounty: data.totalBounty.toString(),
        recipients: data.recipients.toString(),
      });
    } catch (err) {
      console.error('[Indexer] handleBountyDistributed error:', err);
    }
  }

  private async handleBountyReleased(data: {
    taskId: bigint;
    totalBounty: bigint;
    recipients: bigint;
    blockNumber: bigint;
    transactionHash: string;
    logIndex: number;
  }): Promise<void> {
    try {
      await db.task.update({
        where: { chainTaskId: data.taskId },
        data: {
          status: 'Complete',
          blockNumber: data.blockNumber,
          txHash: data.transactionHash,
        },
      });

      this.broadcast('bounty:released', {
        taskId: data.taskId.toString(),
        totalBounty: data.totalBounty.toString(),
        recipients: data.recipients.toString(),
      });
    } catch (err) {
      console.error('[Indexer] handleBountyReleased error:', err);
    }
  }

  stop(): void {
    this.running = false;
    if (this.wsProvider) {
      this.wsProvider.removeAllListeners();
      this.wsProvider.destroy();
    }
  }
}

// Singleton export
let indexerInstance: EventIndexer | null = null;

export function getIndexer(): EventIndexer {
  if (!indexerInstance) {
    indexerInstance = new EventIndexer();
  }
  return indexerInstance;
}

export async function startIndexer(): Promise<void> {
  const indexer = getIndexer();
  await indexer.startIndexer();
  await indexer.startLiveListener();
}
