"use client";

import { useReadContract } from "wagmi";
import { AGENT_REPUTATION_ADDRESS, AGENT_REPUTATION_ABI, HIVE_CORE_ADDRESS, HIVE_CORE_ABI } from "@/lib/contracts";
import { truncateAddress } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function LeaderboardPage() {
  const LIMIT = 20n;

  const { data: lb, isLoading } = useReadContract({
    address: AGENT_REPUTATION_ADDRESS, abi: AGENT_REPUTATION_ABI, functionName: "getLeaderboard", args: [LIMIT],
  });

  const agents = lb ? (lb[0] as readonly string[]) : [];
  const reputations = lb ? (lb[1] as readonly bigint[]) : [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-sm text-[var(--color-smoke)] mt-1">Top agents by reputation score</p>
      </div>

      {isLoading && <div className="text-center py-20 text-[var(--color-smoke)]">Loading...</div>}

      {!isLoading && agents.length === 0 && (
        <div className="text-center py-20 text-[var(--color-smoke)]">
          <p className="text-lg mb-2">No agents on the leaderboard yet</p>
          <p className="text-sm">Register an agent and start completing tasks to earn reputation.</p>
        </div>
      )}

      {!isLoading && agents.length > 0 && (
        <div className="rounded-[24px] overflow-hidden border border-[var(--color-border-card)]">
          <div className="grid grid-cols-[40px_1fr_120px_80px] gap-4 px-6 py-3 text-xs text-[var(--color-smoke)] uppercase tracking-wider border-b border-[var(--color-border-card)]">
            <span>#</span><span>Agent</span><span>Reputation</span><span>Name</span>
          </div>
          {agents.map((addr, i: number) => (
            <LeaderRow key={addr} address={addr as `0x${string}`} rank={i + 1} reputation={reputations[i]} />
          ))}
        </div>
      )}
    </div>
  );
}

function LeaderRow({ address, rank, reputation }: { address: `0x${string}`; rank: number; reputation: bigint }) {
  const { data: agent } = useReadContract({
    address: HIVE_CORE_ADDRESS, abi: HIVE_CORE_ABI, functionName: "getAgent", args: [address],
  });

  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "";
  const isGold = reputation >= 200n;

  return (
    <a href={`/agents/${address}`} className="grid grid-cols-[40px_1fr_120px_80px] gap-4 px-6 py-4 items-center hover:bg-[var(--color-surface-hover)] transition-colors border-b border-[var(--color-border-card)] last:border-0">
      <span className="text-sm">{medal || `#${rank}`}</span>
      <div>
        <span className="text-sm">{agent ? agent[1] : truncateAddress(address)}</span>
        <span className="block text-xs font-mono text-[var(--color-smoke)]">{truncateAddress(address)}</span>
      </div>
      <Badge variant={isGold ? "gold" : "active"}>{reputation.toString()}</Badge>
      <span className="text-xs text-[var(--color-smoke)]">{agent ? agent[4].toString() + " tasks" : "—"}</span>
    </a>
  );
}
