import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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

export function TaskCard({ id, creator, prompt, bounty, minAgents, maxAgents, deadline, status, claimedCount = 0 }: TaskCardProps) {
  return (
    <Link href={`/tasks/${id}`} className="block p-5 rounded-[24px] bg-[var(--color-surface-card)] border border-[var(--color-border-card)] hover:bg-[var(--color-surface-hover)] hover:-translate-y-0.5 hover:border-white/12 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <Badge variant={statusVariant(status)}>{statusFromEnum(status)}</Badge>
        <span className="font-mono text-sm text-[var(--color-bounty)]">{formatEtherDisplay(bounty)} RITUAL</span>
      </div>
      <p className="text-sm text-[var(--color-bone)] line-clamp-2 mb-3 leading-relaxed group-hover:text-[var(--color-plum-voltage)] transition-colors duration-200">{prompt}</p>
      <div className="flex items-center justify-between text-xs text-[var(--color-smoke)] font-mono">
        <span>{claimedCount}/{maxAgents} agents</span>
        <span>{formatDeadline(deadline)}</span>
      </div>
    </Link>
  );
}
