import { Router, type Request, type Response } from 'express';
import { db } from './db.js';
import type { ApiResponse, PaginatedResponse, StatsData } from './types.js';

const router = Router();

// ---------- Helper ----------
function paginate(page: number, limit: number, total: number) {
  const totalPages = Math.ceil(total / Math.max(limit, 1));
  return {
    skip: (page - 1) * limit,
    take: limit,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

function ok<T>(res: Response, data: T): void {
  const jsonSafe = JSON.parse(JSON.stringify(data, (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value,
  )) as T;
  const body: ApiResponse<T> = { success: true, data: jsonSafe };
  res.json(body);
}

function fail(res: Response, status: number, message: string): void {
  const body: ApiResponse<null> = { success: false, error: message };
  res.status(status).json(body);
}

// ---------- Health ----------
router.get('/health', (_req: Request, res: Response) => {
  ok(res, { status: 'ok', timestamp: new Date().toISOString() });
});

// ---------- Stats ----------
router.get('/api/stats', async (_req: Request, res: Response) => {
  try {
    const [totalTasks, openTasks, executingTasks, synthesizingTasks, completedTasks, failedTasks, totalAgents, activeAgents] =
      await Promise.all([
        db.task.count(),
        db.task.count({ where: { status: 'Open' } }),
        db.task.count({ where: { status: 'Executing' } }),
        db.task.count({ where: { status: 'Synthesizing' } }),
        db.task.count({ where: { status: 'Complete' } }),
        db.task.count({ where: { status: 'Failed' } }),
        db.agent.count(),
        db.agent.count({ where: { active: true } }),
      ]);

    const stats: StatsData = {
      totalTasks,
      openTasks,
      executingTasks,
      synthesizingTasks,
      completedTasks,
      failedTasks,
      totalAgents,
      activeAgents,
    };

    ok(res, stats);
  } catch (err) {
    fail(res, 500, `Failed to fetch stats: ${(err as Error).message}`);
  }
});

// ---------- Tasks: List ----------
router.get('/api/tasks', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const status = req.query.status as string | undefined;
    const creator = req.query.creator as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (creator) where.creator = creator.toLowerCase();

    const total = await db.task.count({ where });
    const { skip, take, pagination } = paginate(page, limit, total);

    const tasks = await db.task.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { submissions: true } },
      },
    });

    const data = tasks.map((t) => ({
      ...t,
      submissionCount: t._count.submissions,
      _count: undefined,
    }));

    ok(res, { data, pagination });
  } catch (err) {
    fail(res, 500, `Failed to fetch tasks: ${(err as Error).message}`);
  }
});

// ---------- Tasks: Single ----------
router.get('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      // Try chainTaskId
      const task = await db.task.findUnique({
        where: { chainTaskId: BigInt(req.params.id) },
        include: { submissions: true, synthesis: true },
      });
      if (!task) return fail(res, 404, 'Task not found');
      return ok(res, task);
    }

    const task = await db.task.findUnique({
      where: { id },
      include: { submissions: true, synthesis: true },
    });
    if (!task) return fail(res, 404, 'Task not found');
    ok(res, task);
  } catch (err) {
    fail(res, 500, `Failed to fetch task: ${(err as Error).message}`);
  }
});

// ---------- Agents: List ----------
router.get('/api/agents', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const search = req.query.search as string | undefined;
    const sortBy = (req.query.sortBy as string) || 'reputation';
    const order = (req.query.order as string) === 'asc' ? 'asc' : 'desc';

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { address: { contains: search.toLowerCase() } },
        { name: { contains: search } },
      ];
    }

    // Validate sort field
    const validSorts = ['reputation', 'tasksCompleted', 'totalEarned'];
    const orderByField = validSorts.includes(sortBy) ? sortBy : 'reputation';

    const total = await db.agent.count({ where });
    const { skip, take, pagination } = paginate(page, limit, total);

    const agents = await db.agent.findMany({
      where,
      skip,
      take,
      orderBy: { [orderByField]: order },
    });

    ok(res, { data: agents, pagination });
  } catch (err) {
    fail(res, 500, `Failed to fetch agents: ${(err as Error).message}`);
  }
});

// ---------- Agents: Single ----------
router.get('/api/agents/:address', async (req: Request, res: Response) => {
  try {
    const address = req.params.address.toLowerCase();
    const agent = await db.agent.findUnique({ where: { address } });
    if (!agent) return fail(res, 404, 'Agent not found');

    // Fetch task history: submissions with task data
    const submissions = await db.submission.findMany({
      where: { agent: address },
      include: { task: true },
      orderBy: { createdAt: 'desc' },
    });

    // Unique tasks this agent participated in
    const taskIds = [...new Set(submissions.map((s) => s.taskId))];
    const tasks = await db.task.findMany({
      where: { id: { in: taskIds } },
      orderBy: { createdAt: 'desc' },
    });

    ok(res, { agent, submissions, tasks });
  } catch (err) {
    fail(res, 500, `Failed to fetch agent: ${(err as Error).message}`);
  }
});

// ---------- Leaderboard ----------
router.get('/api/leaderboard', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '10'), 10)));

    const agents = await db.agent.findMany({
      where: { active: true },
      orderBy: { reputation: 'desc' },
      take: limit,
    });

    ok(res, agents.map((agent) => ({
      ...agent,
      reputation: agent.reputation.toString(),
      totalEarned: agent.totalEarned,
    })));
  } catch (err) {
    fail(res, 500, `Failed to fetch leaderboard: ${(err as Error).message}`);
  }
});

// ---------- Submissions by Task ----------
router.get('/api/submissions/:taskId', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const verified = req.query.verified;

    const where: Record<string, unknown> = {};
    if (isNaN(taskId)) {
      const task = await db.task.findUnique({ where: { chainTaskId: BigInt(req.params.taskId) } });
      if (!task) return fail(res, 404, 'Task not found');
      where.taskId = task.id;
    } else {
      where.taskId = taskId;
    }

    if (verified === 'true') where.verified = true;
    else if (verified === 'false') where.verified = false;

    const submissions = await db.submission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    ok(res, submissions);
  } catch (err) {
    fail(res, 500, `Failed to fetch submissions: ${(err as Error).message}`);
  }
});

// ---------- Bounty Stats ----------
router.get('/api/bounties/stats', async (_req: Request, res: Response) => {
  try {
    const completedTasks = await db.task.findMany({
      where: { status: 'Complete' },
      select: { bounty: true },
    });

    const totalBountyDistributed = completedTasks.reduce(
      (sum, t) => sum + BigInt(t.bounty || '0'),
      BigInt(0),
    );

    ok(res, {
      totalBountyDistributed: totalBountyDistributed.toString(),
      totalCompletedTasks: completedTasks.length,
    });
  } catch (err) {
    fail(res, 500, `Failed to fetch bounty stats: ${(err as Error).message}`);
  }
});

export default router;
