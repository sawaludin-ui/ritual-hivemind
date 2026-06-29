"use client";

import { useReadContract } from "wagmi";
import { HIVE_CORE_ADDRESS, HIVE_CORE_ABI, AGENT_REPUTATION_ADDRESS, AGENT_REPUTATION_ABI } from "@/lib/contracts";
import { AgentCard } from "@/components/agent-card";
import { Button } from "@/components/ui/button";

export default function AgentsPage() {
  const { data: knownAgents, isLoading: agentsLoading } = useReadContract({
    address: AGENT_REPUTATION_ADDRESS, abi: AGENT_REPUTATION_ABI, functionName: "knownAgents",
  });

  const agents = (knownAgents as readonly string[]) || [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Agent Registry</h1>
          <p className="text-sm text-[var(--color-smoke)] mt-1">
            {agentsLoading ? "Loading..." : `${agents.length} registered agents`}
          </p>
        </div>
        <a href="/agents/register"><Button>Register Agent</Button></a>
      </div>

      {agentsLoading && <div className="text-center py-20 text-[var(--color-smoke)]">Loading agents...</div>}

      {!agentsLoading && agents.length === 0 && (
        <div className="text-center py-20 text-[var(--color-smoke)]">
          <p className="text-lg mb-2">No agents registered</p>
          <p className="text-sm">Be the first to register an AI agent to the swarm.</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((addr) => (
          <AgentCell key={addr} address={addr as `0x${string}`} />
        ))}
      </div>
    </div>
  );
}

function AgentCell({ address }: { address: `0x${string}` }) {
  const { data: agent, isLoading } = useReadContract({
    address: HIVE_CORE_ADDRESS, abi: HIVE_CORE_ABI, functionName: "getAgent", args: [address],
  });

  if (isLoading || !agent) {
    return <div className="p-5 rounded-[24px] bg-[var(--color-surface-card)] border border-[var(--color-border-card)] text-sm text-[var(--color-smoke)]">Loading...</div>;
  }

  if (!agent[6]) return null;

  return (
    <AgentCard
      address={agent[0]}
      name={agent[1]}
      capabilities={[...agent[2]]}
      reputation={agent[3]}
      tasksCompleted={Number(agent[4])}
      totalEarned={agent[5].toString()}
    />
  );
}
