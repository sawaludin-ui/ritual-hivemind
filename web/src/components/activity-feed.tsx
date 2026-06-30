"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import {
  HIVEMIND_CORE_ADDRESS,
  HIVEMIND_CORE_ABI,
  SWARM_EXECUTION_ADDRESS,
  SWARM_ABI,
} from "@/lib/contracts";
import { formatDeadline, truncateAddress } from "@/lib/utils";
import {
  Brain,
  ArrowRight,
  Circle,
  Spinner,
} from "@phosphor-icons/react";

const MAX_FEED_ITEMS = 12;

// TODO: When indexer is persisted, fetch recent tasks from indexer WebSocket
// instead of N individual getTask RPC calls. Current approach is fine for testnet
// (taskCount < 100), but won't scale to mainnet with high task volume.

export function ActivityFeed() {
  const {
    data: taskCountData,
    isLoading,
    isError,
  } = useReadContract({
    address: HIVEMIND_CORE_ADDRESS,
    abi: HIVEMIND_CORE_ABI,
    functionName: "taskCount",
  });

  const total = taskCountData ? Number(taskCountData) : 0;

  // Only fetch the last N candidate IDs
  const candidateIds = useMemo(() => {
    if (total === 0) return [];
    const ids: bigint[] = [];
    const from = Math.max(0, total - MAX_FEED_ITEMS);
    for (let i = total - 1; i >= from; i--) {
      ids.push(BigInt(i));
    }
    return ids;
  }, [total]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-white/[0.04] animate-pulse"
          >
            <div className="flex items-start gap-4">
              <div className="w-2.5 h-2.5 mt-1 rounded-full skeleton shrink-0" />
              <div className="flex-1">
                <div className="h-3 w-32 rounded skeleton mb-2" />
                <div className="h-4 w-full rounded skeleton mb-1" />
                <div className="h-3 w-2/3 rounded skeleton mt-2" />
              </div>
              <div className="h-4 w-4 rounded skeleton shrink-0" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Error ──
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-swarm-fail/10 flex items-center justify-center">
          <Brain size={26} weight="light" className="text-smoke/30" />
        </div>
        <p className="text-sm text-smoke">Unable to load activity feed.</p>
      </div>
    );
  }

  // ── Empty ──
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-white/[0.08] flex items-center justify-center">
          <Brain size={26} weight="light" className="text-smoke/50" />
        </div>
        <p className="text-base text-smoke">
          No tasks yet. Be the first to summon the swarm.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {candidateIds.map((id) => (
        <ActivityRow key={id.toString()} taskId={id} />
      ))}
    </div>
  );
}

function ActivityRow({ taskId }: { taskId: bigint }) {
  const { data: task } = useReadContract({
    address: HIVEMIND_CORE_ADDRESS,
    abi: HIVEMIND_CORE_ABI,
    functionName: "getTask",
    args: [taskId],
  });

  // Fetch synthesis only for completed tasks (status 3).
  // Reading getSynthesis for active tasks is unnecessary RPC load.
  const [prompt, deadline, status] = task
    ? [task[2] as string, task[7] as bigint, task[8] as number]
    : ["", 0n, 0];

  const isComplete = status === 3;
  const isActive = status === 1;

  // Fetch synthesis only when task is complete
  // Wagmi deduplicates reads with same (address, args, functionName)
  const { data: synthesis } = useReadContract({
    address: SWARM_EXECUTION_ADDRESS,
    abi: SWARM_ABI,
    functionName: "getSynthesis",
    args: [taskId],
    query: { enabled: isComplete },
  });

  if (!task) return null;
  if (!isActive && !isComplete) return null;

  const creator = task[1] as `0x${string}`;
  const report = synthesis ? String(synthesis.consensusReport).slice(0, 120) : "";
  const score = synthesis ? Number(synthesis.consensusScore) : null;

  return (
    <Link
      href={`/tasks/${taskId}`}
      className="group flex items-start gap-4 p-4 rounded-2xl border border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.01] transition-all duration-150"
    >
      {/* Status dot */}
      <div className="mt-1 shrink-0">
        {isComplete ? (
          <Circle size={10} weight="fill" className="text-lichen" />
        ) : (
          <Circle size={10} weight="fill" className="text-amber-spark animate-pulse" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-smoke tracking-caps">
            #{taskId.toString()}
          </span>
          <span
            className={`text-xs tracking-caps ${isComplete ? "text-lichen" : "text-amber-spark"}`}
          >
            {isComplete ? "Complete" : "Executing"}
          </span>
          {score !== null && (
            <span className="text-xs text-smoke ml-auto">Score: {score}/10</span>
          )}
        </div>
        <p className="text-sm text-bone leading-relaxed line-clamp-2 group-hover:text-plum-voltage transition-colors">
          {prompt.slice(0, 150)}
          {prompt.length > 150 ? "…" : ""}
        </p>
        {isComplete && report && (
          <p className="text-xs text-smoke mt-1.5 leading-relaxed line-clamp-2 italic">
            &ldquo;{report}&rdquo;
          </p>
        )}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-smoke">{truncateAddress(creator)}</span>
          <span className="text-xs text-smoke">{formatDeadline(deadline)}</span>
        </div>
      </div>

      <ArrowRight
        size={14}
        weight="bold"
        className="text-smoke/30 group-hover:text-plum-voltage group-hover:translate-x-0.5 transition-all mt-1 shrink-0"
      />
    </Link>
  );
}