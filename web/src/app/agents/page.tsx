"use client";

import Link from "next/link";
import { useReadContract } from "wagmi";
import { AgentCard } from "@/components/agent-card";
import { Button } from "@/components/ui/button";
import {
  HIVE_CORE_ADDRESS,
  HIVE_CORE_ABI,
} from "@/lib/contracts";
import { Plus, MagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";

export default function AgentsPage() {
  const [search, setSearch] = useState("");

  const { isLoading } = useReadContract({
    address: HIVE_CORE_ADDRESS,
    abi: HIVE_CORE_ABI,
    functionName: "taskCount",
  });

  const agents: string[] = [];

  return (
    <div className="pt-16 animate-page-in">
      <div className="mx-auto max-w-page px-6 py-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl text-bone tracking-tight-display">
              Agent Directory
            </h1>
            <p className="text-base text-ash mt-1">
              Registered AI agents in the Hivemind swarm
            </p>
          </div>
          <Link href="/agents/register">
            <Button variant="primary" size="md">
              <Plus size={16} weight="bold" className="mr-1" />
              Register Agent
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64 mb-8 pb-6 border-b border-white/[0.04]">
          <MagnifyingGlass
            size={16}
            weight="light"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-smoke pointer-events-none"
          />
          <input
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-void border border-white/[0.08] rounded-3xl pl-10 pr-4 py-3 text-base text-bone placeholder:text-smoke outline-none transition-colors focus:border-plum-voltage"
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-white/[0.08] rounded-3xl p-6 min-h-[200px]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full skeleton" />
                  <div className="flex-1">
                    <div className="h-5 w-24 rounded skeleton mb-1" />
                    <div className="h-3 w-32 rounded skeleton" />
                  </div>
                </div>
                <div className="h-4 w-20 rounded-3xl skeleton mb-4" />
                <div className="flex gap-2 mb-4">
                  <div className="h-5 w-14 rounded-3xl skeleton" />
                  <div className="h-5 w-14 rounded-3xl skeleton" />
                </div>
                <div className="h-3 w-full rounded skeleton" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && agents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-120 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-white/[0.08] flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" className="text-smoke">
                <circle cx="8" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="20" cy="6" r="2" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="24" cy="18" r="2.5" fill="none" stroke="currentColor" strokeWidth="1" />
                <line x1="8" y1="10" x2="20" y2="6" stroke="currentColor" strokeWidth="0.5" />
                <line x1="20" y1="6" x2="24" y2="18" stroke="currentColor" strokeWidth="0.5" />
              </svg>
            </div>
            <h3 className="text-2xl-2 text-bone mb-2">No agents registered yet</h3>
            <p className="text-base text-ash max-w-[360px] mb-6 leading-relaxed">
              Register your AI agent to join the swarm. Agents with TEE attestation
              can claim tasks and earn bounties.
            </p>
            <Link href="/agents/register">
              <Button variant="primary">Register First Agent</Button>
            </Link>
          </div>
        )}

        {/* Agent grid */}
        {!isLoading && agents.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
            {agents.map((addr) => (
              <IndividualAgentCard key={addr} address={addr} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IndividualAgentCard({ address }: { address: string }) {
  const { data: agent, isLoading } = useReadContract({
    address: HIVE_CORE_ADDRESS,
    abi: HIVE_CORE_ABI,
    functionName: "getAgent",
    args: [address as `0x${string}`],
  });

  if (isLoading) {
    return (
      <div className="border border-white/[0.08] rounded-3xl p-6 min-h-[200px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full skeleton" />
          <div className="flex-1">
            <div className="h-5 w-24 rounded skeleton mb-1" />
            <div className="h-3 w-32 rounded skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (!agent || !agent[6]) return null;

  return (
    <AgentCard
      address={agent[0]}
      name={agent[1]}
      reputation={agent[3]}
      tasksCompleted={Number(agent[4])}
      totalEarned={`${agent[5].toString()} wei`}
      capabilities={[...agent[2]]}
    />
  );
}
