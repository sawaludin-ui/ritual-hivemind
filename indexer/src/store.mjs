// @ts-check

/**
 * In-memory state store for the Hivemind indexer.
 * Lightweight key-value store with snapshot capability.
 * No database needed for testnet — reconstructs from chain on restart.
 */

export class StateStore {
  constructor() {
    /** @type {Map<string, any>} */
    this.tasks = new Map();

    /** @type {Map<string, any>} */
    this.agents = new Map();

    /** @type {Map<string, any[]>} */
    this.submissions = new Map(); // taskId -> submissions[]

    /** @type {Map<string, any>} */
    this.syntheses = new Map();

    /** @type {number} */
    this.lastBlock = 0;

    /** @type {number} */
    this.taskCount = 0;

    /** @type {string[]} */
    this.knownAgents = [];
  }

  /**
   * Snapshot for API/WS broadcast — lightweight serializable view.
   */
  snapshot() {
    const tasks = [];
    for (const [, task] of this.tasks) {
      const subs = this.submissions.get(task.id.toString()) ?? [];
      const syn = this.syntheses.get(task.id.toString());
      tasks.push({
        ...task,
        submissionsCount: subs.length,
        verifiedCount: subs.filter(/** @param {any} s */ (s) => s.verified).length,
        isComplete: task.status === 3,
        isActive: task.status === 1 || task.status === 2,
        synthesis: syn
          ? {
              score: syn.consensusScore,
              report: syn.consensusReport?.slice(0, 200),
              synth: syn.synthesizer,
            }
          : null,
      });
    }

    const agents = [];
    for (const [, agent] of this.agents) {
      agents.push(agent);
    }

    // Sort tasks by id descending (newest first)
    tasks.sort((a, b) => Number(b.id) - Number(a.id));

    // Sort agents by reputation descending
    agents.sort((a, b) => Number(b.reputation) - Number(a.reputation));

    return {
      taskCount: this.taskCount,
      activeTasks: tasks.filter(/** @param {any} t */ (t) => t.isActive).length,
      completeTasks: tasks.filter(/** @param {any} t */ (t) => t.isComplete).length,
      knownAgents: agents.length,
      lastBlock: this.lastBlock,
      tasks,
      agents,
    };
  }

  /**
   * Snapshot for a single task.
   */
  taskSnapshot(taskId) {
    const task = this.tasks.get(String(taskId));
    if (!task) return null;

    const subs = this.submissions.get(String(taskId)) ?? [];
    const syn = this.syntheses.get(String(taskId));

    return {
      ...task,
      submissions: subs,
      synthesis: syn ?? null,
    };
  }

  /**
   * Snapshot for recent activity (for the feed).
   * Returns latest 20 tasks with state changes.
   */
  recentActivity(limit = 20) {
    const all = [];
    for (const [, task] of this.tasks) {
      const subs = this.submissions.get(task.id.toString()) ?? [];
      all.push({
        id: task.id,
        prompt: task.prompt?.slice(0, 150),
        creator: task.creator,
        status: task.status,
        bounty: task.bounty,
        deadline: task.deadline,
        submissionsCount: subs.length,
        claimedAgentCount: task.claimedAgents?.length ?? 0,
        createdAt: task.createdAt,
      });
    }

    all.sort((a, b) => Number(b.id) - Number(a.id));
    return all.slice(0, limit);
  }
}