'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useReadContract } from 'wagmi';
import { TaskCard } from '@/components/task-card';
import { Button } from '@/components/ui/button';
import Input from '@/components/ui/input';
import { HIVEMIND_CORE_ADDRESS, HIVEMIND_CORE_ABI } from '@/lib/contracts';

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: '0' },
  { label: 'Executing', value: '1' },
  { label: 'Complete', value: '3' },
  { label: 'Failed', value: '4' },
] as const;

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: openTaskIds, isLoading, isError, error } = useReadContract({
    address: HIVEMIND_CORE_ADDRESS,
    abi: HIVEMIND_CORE_ABI,
    functionName: 'getOpenTasks',
  });

  const { data: totalTasksData } = useReadContract({
    address: HIVEMIND_CORE_ADDRESS,
    abi: HIVEMIND_CORE_ABI,
    functionName: 'taskCount',
  });

  // Generate full task ID range from 0 to totalTasks-1
  const allTaskIds = useMemo(() => {
    if (!totalTasksData) return [];
    const ids: bigint[] = [];
    for (let i = 0n; i < totalTasksData; i++) {
      ids.push(i);
    }
    return ids;
  }, [totalTasksData]);

  // Combine open task IDs with all task IDs to show a broader set
  const displayIds = useMemo(() => {
    if (!openTaskIds || openTaskIds.length === 0) return allTaskIds;
    // Deduplicate
    const set = new Set(allTaskIds.map(String));
    if (set.size === 0) return openTaskIds;
    return allTaskIds;
  }, [openTaskIds, allTaskIds]);

  // Filtering by search is done client-side when TaskCards load their data
  // For now just show the IDs

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[36px] font-medium leading-[1.1] text-bone">Task Board</h1>
          <p className="text-[14px] text-ash mt-1">
            Browse open tasks or create a new one for the swarm
          </p>
        </div>
        <Link href="/tasks/create">
          <Button variant="primary" size="md">
            Create Task
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`text-xs font-medium tracking-[0.05em] uppercase px-4 py-2 rounded-[24px] transition-colors ${
                statusFilter === f.value
                  ? 'bg-plum-voltage/10 text-plum-voltage border border-plum-voltage/30'
                  : 'text-smoke border border-border-card hover:text-bone'
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-card border border-border-card rounded-2xl p-6 min-h-[180px] animate-pulse"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="h-6 w-16 bg-white/5 rounded-[24px]" />
                <div className="h-5 w-20 bg-white/5 rounded" />
              </div>
              <div className="h-5 w-3/4 bg-white/5 rounded mb-3" />
              <div className="h-4 w-full bg-white/5 rounded mb-1" />
              <div className="h-4 w-2/3 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="bg-surface-card border border-border-card rounded-2xl p-12 text-center">
          <p className="text-[14px] text-swarm-fail mb-2">Failed to load tasks</p>
          <p className="text-[12px] text-smoke">{error?.message || 'Unknown error'}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && displayIds.length === 0 && (
        <div className="bg-surface-card border border-border-card rounded-2xl p-16 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-border-card flex items-center justify-center">
            <span className="text-3xl text-smoke">○</span>
          </div>
          <h3 className="text-[18px] font-semibold text-bone mb-2">No tasks yet</h3>
          <p className="text-[14px] text-ash max-w-[360px] mx-auto mb-6">
            Be the first to submit a task and activate the swarm. Your questions fuel collective
            intelligence.
          </p>
          <Link href="/tasks/create">
            <Button variant="primary">Create the First Task</Button>
          </Link>
        </div>
      )}

      {/* Task grid */}
      {!isLoading && !isError && displayIds.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayIds.map((id) => (
            <IndividualTaskCard key={id.toString()} taskId={id} />
          ))}
        </div>
      )}
    </div>
  );
}

function IndividualTaskCard({ taskId }: { taskId: bigint }) {
  const { data: task, isLoading, isError } = useReadContract({
    address: HIVEMIND_CORE_ADDRESS,
    abi: HIVEMIND_CORE_ABI,
    functionName: 'getTask',
    args: [taskId],
  });

  if (isLoading) {
    return (
      <div className="bg-surface-card border border-border-card rounded-2xl p-6 min-h-[180px] animate-pulse">
        <div className="h-5 w-2/3 bg-white/5 rounded mb-4" />
        <div className="h-4 w-full bg-white/5 rounded mb-1" />
        <div className="h-4 w-1/2 bg-white/5 rounded" />
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
