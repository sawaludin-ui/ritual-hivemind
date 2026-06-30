import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "@phosphor-icons/react";
import { formatEtherDisplay, formatDeadline, statusFromEnum, statusVariant } from "@/lib/utils";

interface TaskCardProps {
  id: bigint;
  creator: string;
  prompt: string;
  bounty: bigint;
  minAgents: number;
  maxAgents: number;
  deadline: bigint;
  status: number;
  claimedCount?: number;
}

export function TaskCard({
  id,
  creator,
  prompt,
  bounty,
  minAgents,
  maxAgents,
  deadline,
  status,
  claimedCount = 0,
}: TaskCardProps) {
  const isActive = status === 1;
  const isComplete = status === 3;

  return (
    <Link
      href={`/tasks/${id}`}
      className="group block p-6 rounded-card bg-surface-card border border-border-card hover:bg-surface-hover hover:-translate-y-0.5 hover:border-white/[0.12] transition-all duration-200"
    >
      {/* Top row: Status + Bounty */}
      <div className="flex items-start justify-between mb-4">
        <Badge variant={statusVariant(status)} pulse={isActive}>
          {statusFromEnum(status)}
        </Badge>
        <span className="font-mono text-[13px] text-bounty font-medium">
          {formatEtherDisplay(bounty)} RITUAL
        </span>
      </div>

      {/* Task prompt */}
      <p className="text-[14px] text-bone leading-relaxed line-clamp-2 mb-4 group-hover:text-plum-voltage transition-colors duration-200">
        {prompt}
      </p>

      {/* Bottom row: agents + deadline */}
      <div className="flex items-center justify-between text-xs text-smoke font-mono">
        <span className="flex items-center gap-1.5">
          <span className={isComplete ? "text-lichen" : "text-plum-voltage"}>
            ●
          </span>
          {claimedCount}/{maxAgents} agents
        </span>
        <span>{formatDeadline(deadline)}</span>
      </div>

      {/* View link on hover */}
      <div className="mt-4 pt-4 border-t border-white/[0.04] flex items-center justify-between">
        <span className="text-xs text-smoke font-mono">
          #{id.toString()}
        </span>
        <span className="text-xs text-plum-voltage font-medium tracking-[0.021em] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          View Swarm
          <ArrowRight size={12} weight="bold" />
        </span>
      </div>
    </Link>
  );
}
