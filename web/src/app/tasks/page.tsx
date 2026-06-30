"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { TaskCard } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import {
  HIVEMIND_CORE_ADDRESS,
  HIVEMIND_CORE_ABI,
} from "@/lib/contracts";
import { useIndexer, type IndexerTask } from "@/lib/use-indexer";
import { Plus, WifiSlash, WifiHigh } from "@phosphor-icons/react";

const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Open", value: "0" },
  { label: "Executing", value: "1" },
  { label: "Complete", value: "3" },
  { label: "Failed", value: "4" },
] as const;

const statusLabel = (s: number) => {
  return { 0: "Open", 1: "Executing", 2: "Synthesizing", 3: "Complete", 4: "Failed" }[s] ?? "Unknown";
};

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // ── Indexer (preferred) ──
  const { state, connected, error } = useIndexer();
  const indexerTasks: IndexerTask[] = state?.tasks ?? [];

  // ── Contract fallback ──
  const { data: totalTasksData, isLoading: contractLoading } = useReadContract({
    address: HIVEMIND_CORE_ADDRESS,
    abi: HIVEMIND_CORE_ABI,
    functionName: "taskCount",
    query: { enabled: !connected },
  });

  // Which data source are we using?
  const useIndexerSource = connected && indexerTasks.length > 0;
  const useContractSource = !useIndexerSource;

  // Contract task IDs
  const contractTaskIds = useMemo(() => {
    if (!totalTasksData) return [];
    const ids: bigint[] = [];
    for (let i = 0n; i < totalTasksData; i++) {
      ids.push(i);
    }
    return ids;
  }, [totalTasksData]);

  // Filter indexer tasks by status + search
  const filteredIndexerTasks = useMemo(() => {
    let tasks = indexerTasks;
    if (statusFilter !== "all") {
      tasks = tasks.filter((t) => t.status === Number(statusFilter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.prompt?.toLowerCase().includes(q) ||
          t.creator?.toLowerCase().includes(q) ||
          String(t.id).includes(q)
      );
    }
    return tasks;
  }, [indexerTasks, statusFilter, search]);

  const isLoading = useContractSource && contractLoading;

  return (
    <div className="pt-16 animate-page-in">
      <div className="mx-auto max-w-page px-6 py-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h1 className="text-4xl text-bone tracking-tight-display">
                Task Board
              </h1>
              {useIndexerSource && (
                <span className="text-xs text-lichen/70 flex items-center gap-1" title="Live via indexer">
                  <WifiHigh size={12} weight="fill" />
                  live
                </span>
              )}
            </div>
            <p className="text-base text-ash mt-1">
              Browse open tasks or create a new one for the swarm
            </p>
          </div>
          <Link href="/tasks/create">
            <Button variant="primary" size="md">
              <Plus size={16} weight="bold" className="mr-1" />
              Create Task
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 pb-6 border-b border-white/[0.04]">
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`text-xs-3 tracking-caps uppercase px-4 py-2 rounded-3xl transition-all duration-150 ${
                  statusFilter === f.value
                    ? "bg-plum-voltage/10 text-plum-voltage border border-plum-voltage/30"
                    : "text-smoke border border-white/[0.08] hover:text-bone hover:border-white/[0.12]"
                }`}
              >
                {f.label}
                {useIndexerSource && f.value !== "all" && (
                  <span className="ml-1.5 opacity-60">
                    {filteredIndexerTasks.filter((t) => t.status === Number(f.value)).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="sm:ml-auto w-full sm:w-64">
            <input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-void border border-white/[0.08] rounded-3xl px-4 py-3 text-base text-bone placeholder:text-smoke outline-none transition-colors focus:border-plum-voltage"
            />
          </div>
        </div>

        {/* ── INDEXER MODE ── */}
        {useIndexerSource && (
          <>
            {filteredIndexerTasks.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
                {filteredIndexerTasks.map((t) => (
                  <TaskCard
                    key={`idx-${t.id}`}
                    id={BigInt(t.id)}
                    creator={t.creator}
                    prompt={t.prompt}
                    bounty={BigInt(t.bounty)}
                    minAgents={t.minAgents}
                    maxAgents={t.maxAgents}
                    deadline={BigInt(t.deadline)}
                    status={t.status}
                    claimedCount={t.claimedAgents?.length ?? 0}
                    indexerMeta={
                      t.synthesis
                        ? `Score ${t.synthesis.score}/10 · ${t.verifiedCount} verified`
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-base text-smoke">
                  {search
                    ? `No tasks match "${search}"`
                    : statusFilter !== "all"
                      ? `No ${statusLabel(Number(statusFilter))} tasks`
                      : "No tasks yet"}
                </p>
                {!search && statusFilter === "all" && (
                  <Link
                    href="/tasks/create"
                    className="text-sm text-plum-voltage tracking-nav hover:underline mt-2"
                  >
                    Create the first task →
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        {/* ── CONTRACT FALLBACK MODE ── */}
        {useContractSource && (
          <>
            {/* Loading skeleton */}
            {isLoading && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="border border-white/[0.08] rounded-3xl p-6 min-h-[200px]"
                  >
                    <div className="flex justify-between mb-4">
                      <div className="h-6 w-16 rounded-3xl skeleton" />
                      <div className="h-5 w-20 rounded skeleton" />
                    </div>
                    <div className="h-5 w-3/4 rounded skeleton mb-3" />
                    <div className="h-4 w-full rounded skeleton mb-1" />
                    <div className="h-4 w-2/3 rounded skeleton" />
                    <div className="mt-4 pt-4 border-t border-white/[0.04] flex justify-between">
                      <div className="h-3 w-10 rounded skeleton" />
                      <div className="h-3 w-16 rounded skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty */}
            {!isLoading && contractTaskIds.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-white/[0.08] flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 32 32" className="text-smoke">
                    <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1" />
                    <circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </div>
                <h3 className="text-2xl text-bone mb-2">No tasks yet</h3>
                <p className="text-base text-ash max-w-[360px] mb-6 leading-relaxed">
                  Be the first to submit a task and activate the swarm. Your questions fuel
                  collective intelligence.
                </p>
                <Link href="/tasks/create">
                  <Button variant="primary">Create the First Task</Button>
                </Link>
              </div>
            )}

            {/* Contract task grid — all unfiltered (no client-side data available yet) */}
            {!isLoading && contractTaskIds.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
                {contractTaskIds.map((id) => (
                  <IndividualTaskCard key={id.toString()} taskId={id} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function IndividualTaskCard({ taskId }: { taskId: bigint }) {
  const { data: task, isLoading, isError } = useReadContract({
    address: HIVEMIND_CORE_ADDRESS,
    abi: HIVEMIND_CORE_ABI,
    functionName: "getTask",
    args: [taskId],
  });

  if (isLoading) {
    return (
      <div className="border border-white/[0.08] rounded-3xl p-6 min-h-[200px]">
        <div className="flex justify-between mb-4">
          <div className="h-6 w-16 rounded-3xl skeleton" />
          <div className="h-5 w-20 rounded skeleton" />
        </div>
        <div className="h-5 w-3/4 rounded skeleton mb-3" />
        <div className="h-4 w-full rounded skeleton mb-1" />
        <div className="h-4 w-2/3 rounded skeleton" />
      </div>
    );
  }

  if (isError || !task) return null;

  const [, creator, prompt, bounty, minAgents, maxAgents, , deadline, status, claimedAgents = []] = task;

  return (
    <TaskCard
      id={taskId}
      creator={creator}
      prompt={prompt}
      bounty={bounty}
      minAgents={minAgents}
      maxAgents={maxAgents}
      deadline={deadline}
      status={status}
      claimedCount={claimedAgents.length}
    />
  );
}
