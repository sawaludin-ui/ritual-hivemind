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
  /** Extra metadata from indexer (submissions, synthesis score, etc.) */
  indexerMeta?: string;
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
  indexerMeta,
}: TaskCardProps) {
  const isActive = status === 1;
  const isComplete = status === 3;

  return (
    <Link
      href={`/tasks/${id}`}
      className="group block p-6 rounded-3xl border border-white/[0.08] hover:border-white/[0.12] hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Top row: Status + Bounty */}
      <div className="flex items-start justify-between mb-4">
        <Badge variant={statusVariant(status)} pulse={isActive}>
          {statusFromEnum(status)}
        </Badge>
        <span className="text-base text-bounty tracking-nav">
          {formatEtherDisplay(bounty)} RITUAL
        </span>
      </div>

      {/* Task prompt */}
      <p className="text-base text-bone leading-relaxed line-clamp-2 mb-3 group-hover:text-plum-voltage transition-colors duration-200">
        {prompt}
      </p>

      {/* Indexer metadata (synthesis score, etc) */}
      {indexerMeta && (
        <p className="text-xs text-smoke/60 mb-3 truncate">{indexerMeta}</p>
      )}

      {/* Bottom row: agents + deadline */}
      <div className="flex items-center justify-between text-xs text-smoke tracking-body">
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
        <span className="text-xs text-smoke tracking-body">
          #{id.toString()}
        </span>
        <span className="text-sm text-plum-voltage tracking-nav flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          View Swarm
          <ArrowRight size={12} weight="bold" />
        </span>
      </div>
    </Link>
  );
}
