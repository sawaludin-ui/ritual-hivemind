"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HIVE_CORE_ADDRESS,
  HIVE_CORE_ABI,
  AGENT_REPUTATION_ADDRESS,
  AGENT_REPUTATION_ABI,
} from "@/lib/contracts";
import { truncateAddress, formatEtherDisplay } from "@/lib/utils";
import { ArrowLeft, Warning, Robot, Trophy, Coins, CheckCircle } from "@phosphor-icons/react";

export default function AgentProfilePage() {
  const params = useParams();
  const address = params.address as string;

  const { data: agent, isLoading, isError } = useReadContract({
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

  if (isLoading) {
    return (
      <div className="pt-16 max-w-page mx-auto px-6 py-12 animate-page-in">
        <div className="space-y-6">
          <div className="h-4 w-32 rounded skeleton" />
          <div className="h-32 w-full rounded-3xl skeleton" />
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="h-24 rounded-3xl skeleton" />
            <div className="h-24 rounded-3xl skeleton" />
            <div className="h-24 rounded-3xl skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !agent) {
    return (
      <div className="pt-16 max-w-page mx-auto px-6 py-12 animate-page-in">
        <div className="flex flex-col items-center justify-center py-120 text-center">
          <Warning size={48} weight="light" className="text-swarm-fail mb-4" />
          <p className="text-base text-swarm-fail mb-2">Agent not found</p>
          <p className="text-xs text-smoke mb-6">
            {truncateAddress(address)} is not registered in the swarm.
          </p>
          <Link href="/agents">
            <Button variant="ghost">
              <ArrowLeft size={16} weight="bold" className="mr-1" />
              Back to Agents
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const [, name, capabilities, reputation, tasksCompleted, totalEarned, active] = agent;
  const isGold = reputation >= 200n;
  const earnedDisplay = totals ? formatEtherDisplay(totals[2]) : formatEtherDisplay(totalEarned);

  return (
    <div className="pt-16 animate-page-in">
      <div className="mx-auto max-w-page px-6 py-12">
        <Link href="/agents" className="text-xs text-smoke hover:text-bone transition-colors mb-6 inline-flex items-center gap-1">
          <ArrowLeft size={14} weight="bold" />
          Back to Agents
        </Link>

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-12">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-3xl border border-white/[0.08] flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 48 48" className="text-plum-voltage">
                <circle cx="12" cy="15" r="3.5" fill="currentColor" />
                <circle cx="30" cy="9" r="3" fill="currentColor" opacity="0.6" />
                <circle cx="36" cy="27" r="3.5" fill="currentColor" />
                <circle cx="15" cy="33" r="3" fill="currentColor" opacity="0.4" />
                <line x1="12" y1="15" x2="30" y2="9" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
                <line x1="30" y1="9" x2="36" y2="27" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
                <line x1="12" y1="15" x2="15" y2="33" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
                <line x1="15" y1="33" x2="36" y2="27" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
              </svg>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl text-bone tracking-tight-display">
                {name}
              </h1>
              {active ? (
                <Badge variant="active" pulse>Active</Badge>
              ) : (
                <Badge variant="idle">Inactive</Badge>
              )}
            </div>
            <p className="text-base text-smoke tracking-body mb-4">{address}</p>
            <div className="flex flex-wrap items-center gap-2">
              {capabilities.map((cap) => (
                <span key={cap} className="text-xs px-3 py-1 rounded-3xl border border-white/[0.08] text-ash tracking-body">
                  {cap}
                </span>
              ))}
            </div>
          </div>

          {/* Reputation badge */}
          <div className="flex-shrink-0 text-right">
            <Badge variant={isGold ? "gold" : "active"}>
              {reputation.toString()} REP
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          <StatCard
            icon={<Trophy size={20} weight="light" className="text-amber-spark" />}
            label="Reputation"
            value={reputation.toString()}
            sublabel={isGold ? "Gold tier" : "Building trust"}
          />
          <StatCard
            icon={<CheckCircle size={20} weight="light" className="text-lichen" />}
            label="Tasks Completed"
            value={tasksCompleted.toString()}
            sublabel="Lifetime"
          />
          <StatCard
            icon={<Coins size={20} weight="light" className="text-plum-voltage" />}
            label="Total Earned"
            value={earnedDisplay}
            sublabel="RITUAL"
          />
        </div>

        {/* Activity section */}
        <div className="p-6 rounded-3xl border border-white/[0.08]">
          <h2 className="text-lg-2 text-bone mb-4 flex items-center gap-2">
            <Robot size={20} weight="light" className="text-plum-voltage" />
            Recent Activity
          </h2>
          <div className="flex flex-col items-center py-8 text-center">
            <p className="text-base text-smoke mb-2">No recent activity tracked yet.</p>
            <p className="text-xs text-smoke">
              Activity will appear once the indexer starts processing on-chain events.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="p-6 rounded-3xl border border-white/[0.08] hover:border-white/[0.12] transition-colors">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs-3 text-smoke uppercase tracking-caps">{label}</span>
      </div>
      <p className="text-2xl-3 text-bone tracking-tight-display">{value}</p>
      <p className="text-xs text-smoke mt-1">{sublabel}</p>
    </div>
  );
}
