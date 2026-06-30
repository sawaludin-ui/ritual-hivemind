"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { TaskCard } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import {
  HIVEMIND_CORE_ADDRESS,
  HIVEMIND_CORE_ABI,
} from "@/lib/contracts";
import { Plus, Eye, EyeSlash } from "@phosphor-icons/react";

const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Open", value: "0" },
  { label: "Executing", value: "1" },
  { label: "Complete", value: "3" },
  { label: "Failed", value: "4" },
] as const;

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: totalTasksData, isLoading } = useReadContract({
    address: HIVEMIND_CORE_ADDRESS,
    abi: HIVEMIND_CORE_ABI,
    functionName: "taskCount",
  });

  const allTaskIds = useMemo(() => {
    if (!totalTasksData) return [];
    const ids: bigint[] = [];
    for (let i = 0n; i < totalTasksData; i++) {
      ids.push(i);
    }
    return ids;
  }, [totalTasksData]);

  return (
    <div className="pt-16 animate-page-in">
      <div className="mx-auto max-w-page px-6 py-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[36px] font-medium leading-[1.1] text-bone">
              Task Board
            </h1>
            <p className="text-[14px] text-ash mt-1">
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
                className={`text-xs font-medium tracking-[0.05em] uppercase px-4 py-2 rounded-pill transition-all duration-150 ${
                  statusFilter === f.value
                    ? "bg-plum-voltage/10 text-plum-voltage border border-plum-voltage/30"
                    : "text-smoke border border-border-card hover:text-bone hover:border-white/[0.12]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="sm:ml-auto w-full sm:w-64">
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface-card border border-border-card rounded-card p-6 min-h-[200px]"
              >
                <div className="flex justify-between mb-4">
                  <div className="h-6 w-16 rounded-pill skeleton" />
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

        {/* Empty state */}
        {!isLoading && allTaskIds.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-border-card flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" className="text-smoke">
                <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" strokeWidth="1" />
              </svg>
            </div>
            <h3 className="text-[18px] font-semibold text-bone mb-2">No tasks yet</h3>
            <p className="text-[14px] text-ash max-w-[360px] mb-6 leading-relaxed">
              Be the first to submit a task and activate the swarm. Your questions fuel
              collective intelligence.
            </p>
            <Link href="/tasks/create">
              <Button variant="primary">Create the First Task</Button>
            </Link>
          </div>
        )}

        {/* Task grid */}
        {!isLoading && allTaskIds.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
            {allTaskIds.map((id) => (
              <IndividualTaskCard key={id.toString()} taskId={id} />
            ))}
          </div>
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
      <div className="bg-surface-card border border-border-card rounded-card p-6 min-h-[200px]">
        <div className="flex justify-between mb-4">
          <div className="h-6 w-16 rounded-pill skeleton" />
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