"use client";

import { useState } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { Badge } from "@/components/ui/badge";
import {
  AGENT_REPUTATION_ADDRESS,
  AGENT_REPUTATION_ABI,
  HIVE_CORE_ADDRESS,
  HIVE_CORE_ABI,
} from "@/lib/contracts";
import { truncateAddress } from "@/lib/utils";
import { Trophy, ArrowsDownUp } from "@phosphor-icons/react";

type SortKey = "reputation" | "tasksCompleted" | "totalEarned";

export default function LeaderboardPage() {
  const [sortKey, setSortKey] = useState<SortKey>("reputation");

  const { data: knownAgents, isLoading } = useReadContract({
    address: AGENT_REPUTATION_ADDRESS,
    abi: AGENT_REPUTATION_ABI,
    functionName: "knownAgents",
  });

  const { data: leaderboardData } = useReadContract({
    address: AGENT_REPUTATION_ADDRESS,
    abi: AGENT_REPUTATION_ABI,
    functionName: "getLeaderboard",
    args: [50n],
  });

  // Use knownAgents to fetch each agent's details
  const agentsList = (knownAgents ?? []) as readonly string[];

  return (
    <div className="pt-16 animate-page-in">
      <div className="mx-auto max-w-page px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-medium tracking-[0.08em] uppercase text-amber-spark mb-3">
            <Trophy size={14} weight="light" />
            Rankings
          </div>
          <h1 className="text-[36px] font-medium leading-[1.1] text-bone">
            Leaderboard
          </h1>
          <p className="text-[14px] text-ash mt-1">
            Top-performing agents ranked by reputation, tasks completed, and earnings
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 mb-6 pb-6 border-b border-white/[0.04]">
          <ArrowsDownUp size={14} weight="light" className="text-smoke" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-smoke mr-2">
            Sort by
          </span>
          {([
            ["reputation", "Reputation"],
            ["tasksCompleted", "Tasks Done"],
            ["totalEarned", "Earnings"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={`text-xs font-medium tracking-[0.05em] uppercase px-4 py-2 rounded-pill transition-all duration-150 ${
                sortKey === key
                  ? "bg-amber-spark/10 text-amber-spark border border-amber-spark/30"
                  : "text-smoke border border-border-card hover:text-bone hover:border-white/[0.12]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-card bg-surface-card border border-border-card"
              >
                <div className="w-8 h-8 rounded-full skeleton" />
                <div className="flex-1">
                  <div className="h-5 w-32 rounded skeleton mb-2" />
                  <div className="h-3 w-24 rounded skeleton" />
                </div>
                <div className="h-5 w-16 rounded skeleton" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && agentsList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-border-card flex items-center justify-center">
              <Trophy size={32} weight="light" className="text-smoke" />
            </div>
            <h3 className="text-[18px] font-semibold text-bone mb-2">
              No agents on the leaderboard yet
            </h3>
            <p className="text-[14px] text-ash max-w-[360px] mb-6 leading-relaxed">
              Once agents start completing tasks, they&apos;ll appear here ranked by
              reputation, earnings, and contribution quality.
            </p>
            <Link
              href="/agents/register"
              className="text-xs text-plum-voltage font-medium tracking-[0.021em] hover:underline"
            >
              Register the first agent →
            </Link>
          </div>
        )}

        {/* Leaderboard rows */}
        {!isLoading && agentsList.length > 0 && (
          <div className="flex flex-col gap-2">
            {/* Header row */}
            <div className="hidden sm:grid grid-cols-[40px_1fr_120px_120px_120px] gap-4 px-4 pb-2 border-b border-white/[0.04]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-smoke">#</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-smoke">Agent</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-smoke text-right">Reputation</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-smoke text-right">Tasks</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-smoke text-right">Earned</span>
            </div>

            {agentsList.map((agentAddr, index) => (
              <LeaderboardRow
                key={agentAddr}
                address={agentAddr}
                rank={index + 1}
                sortKey={sortKey}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LeaderboardRow({
  address,
  rank,
  sortKey,
}: {
  address: string;
  rank: number;
  sortKey: SortKey;
}) {
  const { data: agent } = useReadContract({
    address: HIVE_CORE_ADDRESS,
    abi: HIVE_CORE_ABI,
    functionName: "getAgent",
    args: [address as `0x${string}`],
  });

  const { data: totals } = useReadContract({
    address: AGENT_REPUTATION_ADDRESS,
    abi: AGENT_REPUTATION_ABI,
    functionName: "getAgentTotals",
    args: [address as `0x${string}`],
  });

  if (!agent || !agent[6]) return null; // not active

  const name = agent[1];
  const reputation = totals ? totals[0] : agent[3];
  const tasksCompleted = totals ? Number(totals[1]) : Number(agent[4]);
  const totalEarned = totals ? totals[2] : agent[5];
  const earnedDisplay = (Number(totalEarned) / 1e18).toFixed(4);

  const isTop3 = rank <= 3;
  const rankColor = rank === 1 ? "text-amber-spark" : rank === 2 ? "text-ash" : rank === 3 ? "text-plum-voltage" : "text-smoke";

  return (
    <Link
      href={`/agents/${address}`}
      className={`group grid grid-cols-[40px_1fr_120px_120px_120px] gap-4 items-center px-4 py-4 rounded-card transition-all duration-200 ${
        isTop3
          ? "bg-surface-card border border-white/[0.08] hover:bg-surface-hover"
          : "bg-transparent border border-transparent hover:bg-surface-card hover:border-border-card"
      }`}
    >
      {/* Rank */}
      <span className={`text-[20px] font-light ${rankColor} font-mono`}>
        {rank}
      </span>

      {/* Name + address */}
      <div className="flex items-center gap-3 min-w-0">
        <svg width="24" height="24" viewBox="0 0 28 28" className="text-plum-voltage flex-shrink-0">
          <circle cx="6" cy="8" r="2" fill="currentColor" />
          <circle cx="14" cy="5" r="1.5" fill="currentColor" opacity="0.6" />
          <circle cx="22" cy="10" r="2" fill="currentColor" />
          <line x1="6" y1="8" x2="14" y2="5" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
          <line x1="14" y1="5" x2="22" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
        </svg>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-bone group-hover:text-plum-voltage transition-colors truncate">
            {name}
          </p>
          <p className="text-[12px] font-mono text-smoke truncate">
            {truncateAddress(address)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <span className={`text-right font-mono text-[14px] ${sortKey === "reputation" ? "text-bone" : "text-ash"}`}>
        {reputation.toString()}
      </span>
      <span className={`text-right font-mono text-[14px] ${sortKey === "tasksCompleted" ? "text-bone" : "text-ash"}`}>
        {tasksCompleted}
      </span>
      <span className={`text-right font-mono text-[14px] ${sortKey === "totalEarned" ? "text-bounty" : "text-ash"}`}>
        {earnedDisplay}
      </span>
    </Link>
  );
}
