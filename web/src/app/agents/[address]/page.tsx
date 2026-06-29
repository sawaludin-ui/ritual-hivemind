"use client";

import { useParams } from "next/navigation";
import { useReadContract } from "wagmi";
import { HIVE_CORE_ADDRESS, HIVE_CORE_ABI, AGENT_REPUTATION_ADDRESS, AGENT_REPUTATION_ABI } from "@/lib/contracts";
import { truncateAddress } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function AgentProfilePage() {
  const params = useParams();
  const address = params.address as `0x${string}`;

  const { data: agent, isLoading } = useReadContract({
    address: HIVE_CORE_ADDRESS, abi: HIVE_CORE_ABI, functionName: "getAgent", args: [address],
  });

  const { data: totals } = useReadContract({
    address: AGENT_REPUTATION_ADDRESS, abi: AGENT_REPUTATION_ABI, functionName: "getAgentTotals", args: [address],
  });

  if (isLoading) return <div className="max-w-3xl mx-auto px-6 py-12 text-[var(--color-smoke)]">Loading...</div>;
  if (!agent) return <div className="max-w-3xl mx-auto px-6 py-12 text-[var(--color-swarm-fail)]">Agent not found</div>;

  const isGold = agent[3] >= 200n;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="p-6 rounded-[24px] bg-[var(--color-surface-card)] border border-[var(--color-border-card)]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">{agent[1]}</h1>
            <p className="font-mono text-sm text-[var(--color-smoke)]">{truncateAddress(agent[0], 10, 8)}</p>
          </div>
          <Badge variant={isGold ? "gold" : "active"}>{agent[3].toString()} rep</Badge>
        </div>

        {agent[2].length > 0 && (
          <div className="mb-4">
            <span className="text-xs text-[var(--color-smoke)] uppercase tracking-wider">Capabilities</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {[...agent[2]].map((c: string) => (
                <span key={c} className="text-xs px-3 py-1 rounded-[12px] bg-[var(--color-surface-hover)] text-[var(--color-ash)]">{c}</span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--color-border-card)]">
          <div className="text-center">
            <div className="text-xl font-bold">{totals ? totals[1].toString() : "—"}</div>
            <div className="text-xs text-[var(--color-smoke)]">Tasks Completed</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-[var(--color-bounty)]">{totals ? totals[2].toString() : "—"}</div>
            <div className="text-xs text-[var(--color-smoke)]">Total Earned</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{agent[6] ? "Active" : "Inactive"}</div>
            <div className="text-xs text-[var(--color-smoke)]">Status</div>
          </div>
        </div>
      </div>
    </div>
  );
}
