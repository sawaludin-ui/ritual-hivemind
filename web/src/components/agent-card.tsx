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

export function AgentCard({
  address,
  name,
  reputation,
  tasksCompleted,
  totalEarned,
  capabilities,
}: AgentCardProps) {
  const isGold = reputation >= 200n;

  return (
    <Link
      href={`/agents/${address}`}
      className="group block p-6 rounded-3xl border border-white/[0.08] hover:border-white/[0.12] hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Agent avatar (particle micro-icon) */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 32 32" className="text-plum-voltage">
            <circle cx="8" cy="10" r="2.5" fill="currentColor" />
            <circle cx="20" cy="6" r="2" fill="currentColor" opacity="0.6" />
            <circle cx="24" cy="18" r="2.5" fill="currentColor" />
            <circle cx="10" cy="22" r="2" fill="currentColor" opacity="0.4" />
            <line x1="8" y1="10" x2="20" y2="6" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
            <line x1="20" y1="6" x2="24" y2="18" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
            <line x1="8" y1="10" x2="10" y2="22" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
          </svg>
          <div>
            <div className="text-lg-2 text-bone group-hover:text-plum-voltage transition-colors duration-200">
              {name}
            </div>
            <div className="text-xs text-smoke tracking-body">
              {truncateAddress(address)}
            </div>
          </div>
        </div>
        <Badge variant={isGold ? "gold" : "active"}>
          {reputation.toString()} rep
        </Badge>
      </div>

      {/* Capabilities */}
      {capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {capabilities.map((c) => (
            <span
              key={c}
              className="text-xs px-2.5 py-1 rounded-3xl border border-white/[0.08] text-ash tracking-body"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-smoke tracking-body pt-4 border-t border-white/[0.04]">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-lichen" />
          {tasksCompleted} tasks
        </span>
        <span>{totalEarned} earned</span>
      </div>
    </Link>
  );
}
