import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { truncateAddress } from "@/lib/utils";

interface AgentCardProps {
  address: string;
  name: string;
  reputation: bigint;
  tasksCompleted: number;
  totalEarned: string;
  capabilities: string[];
}

export function AgentCard({ address, name, reputation, tasksCompleted, totalEarned, capabilities }: AgentCardProps) {
  const isGold = reputation >= 200n;
  return (
    <Link href={`/agents/${address}`} className="block p-5 rounded-[24px] bg-[var(--color-surface-card)] border border-[var(--color-border-card)] hover:bg-[var(--color-surface-hover)] transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-semibold text-sm">{name}</div>
          <div className="text-xs font-mono text-[var(--color-smoke)]">{truncateAddress(address)}</div>
        </div>
        <Badge variant={isGold ? "gold" : "active"}>
          {reputation.toString()} rep
        </Badge>
      </div>
      {capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {capabilities.map((c) => (
            <span key={c} className="text-xs px-2 py-0.5 rounded-[12px] bg-[var(--color-surface-hover)] text-[var(--color-ash)]">{c}</span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-4 text-xs text-[var(--color-smoke)] font-mono">
        <span>{tasksCompleted} tasks</span>
        <span>{totalEarned} earned</span>
      </div>
    </Link>
  );
}
