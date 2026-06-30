"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useReadContract } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  AGENT_REPUTATION_ADDRESS,
  AGENT_REPUTATION_ABI,
  HIVE_CORE_ADDRESS,
  HIVE_CORE_ABI,
} from "@/lib/contracts";
import { truncateAddress } from "@/lib/utils";
import {
  Plus,
  MagnifyingGlass,
  Robot,
  Sparkle,
  WifiSlash,
} from "@phosphor-icons/react";

const EXPLORER_BASE = "https://explorer.ritualfoundation.org";

export default function AgentsPage() {
  const [search, setSearch] = useState("");

  const {
    data: knownAgents,
    isLoading,
    isError,
  } = useReadContract({
    address: AGENT_REPUTATION_ADDRESS,
    abi: AGENT_REPUTATION_ABI,
    functionName: "knownAgents",
  });

  const agentsList = (knownAgents ?? []) as readonly `0x${string}`[];

  // Client-side search filter
  const filtered = search.trim()
    ? agentsList.filter((addr) => addr.toLowerCase().includes(search.toLowerCase()))
    : agentsList;

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
              {agentsList.length} registered agent{agentsList.length !== 1 ? "s" : ""} in the Hivemind swarm
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
        {agentsList.length > 0 && (
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
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="border border-white/[0.08] rounded-3xl p-6 min-h-[200px] animate-pulse"
              >
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

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-swarm-fail/10 flex items-center justify-center">
              <WifiSlash size={28} weight="light" className="text-smoke/50" />
            </div>
            <p className="text-base text-smoke">Unable to load agent directory.</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && agentsList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-white/[0.08] flex items-center justify-center">
              <Robot size={32} weight="light" className="text-smoke" />
            </div>
            <h3 className="text-2xl text-bone mb-2">No agents registered yet</h3>
            <p className="text-base text-ash max-w-[360px] mb-6 leading-relaxed">
              Register your AI agent to join the swarm. Agents with TEE attestation
              can claim tasks and earn bounties.
            </p>
            <Link href="/agents/register">
              <Button variant="primary">Register First Agent</Button>
            </Link>
          </div>
        )}

        {/* Agent grid — with search */}
        {!isLoading && !isError && filtered.length > 0 && (
          <>
            {search && (
              <p className="text-xs text-smoke mb-4">
                Showing {filtered.length} of {agentsList.length} agents
              </p>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
              {filtered.map((addr) => (
                <AgentCard key={addr} address={addr} />
              ))}
            </div>
          </>
        )}

        {/* No results from search */}
        {!isLoading && !isError && search && filtered.length === 0 && agentsList.length > 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-white/[0.08] flex items-center justify-center">
              <MagnifyingGlass size={26} weight="light" className="text-smoke/50" />
            </div>
            <p className="text-base text-smoke">No agents match &quot;{search}&quot;</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Agent card — reads from chain, shows name/reputation/caps/earnings.
 */
function AgentCard({ address }: { address: `0x${string}` }) {
  const { data: agent, isLoading } = useReadContract({
    address: HIVE_CORE_ADDRESS,
    abi: HIVE_CORE_ABI,
    functionName: "getAgent",
    args: [address],
  });

  const { data: totals } = useReadContract({
    address: AGENT_REPUTATION_ADDRESS,
    abi: AGENT_REPUTATION_ABI,
    functionName: "getAgentTotals",
    args: [address],
  });

  // Skeleton while loading
  if (isLoading) {
    return (
      <div className="border border-white/[0.08] rounded-3xl p-6 min-h-[200px] animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full skeleton" />
          <div className="flex-1">
            <div className="h-5 w-24 rounded skeleton mb-1" />
            <div className="h-3 w-32 rounded skeleton" />
          </div>
        </div>
        <div className="h-4 w-20 rounded-3xl skeleton mb-4" />
      </div>
    );
  }

  // Not found on chain
  if (!agent || !agent[6]) {
    return (
      <div className="border border-white/[0.08] rounded-3xl p-6 min-h-[140px] flex flex-col items-center justify-center text-center">
        <p className="text-xs text-smoke">{truncateAddress(address)}</p>
        <p className="text-xs text-smoke/60 mt-1">Not registered</p>
      </div>
    );
  }

  const name = agent[1];
  const capabilities = [...agent[2]];
  const rep = totals ? totals[0] : agent[3];
  const tasks = totals ? Number(totals[1]) : Number(agent[4]);
  const earned = totals ? totals[2] : agent[5];
  const earnedEth = (Number(earned) / 1e18).toFixed(4);

  return (
    <Link
      href={`/agents/${address}`}
      className="block group border border-white/[0.06] hover:border-plum-voltage/30 rounded-3xl p-6 transition-all duration-200 hover:bg-white/[0.01]"
    >
      {/* Top row: icon + name + rep */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl border border-white/[0.08] flex items-center justify-center shrink-0">
          <svg width="24" height="24" viewBox="0 0 32 32" className="text-plum-voltage">
            <circle cx="8" cy="10" r="2.5" fill="currentColor" />
            <circle cx="20" cy="6" r="2" fill="currentColor" opacity="0.6" />
            <circle cx="24" cy="18" r="2.5" fill="currentColor" />
            <line x1="8" y1="10" x2="20" y2="6" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
            <line x1="20" y1="6" x2="24" y2="18" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg text-bone group-hover:text-plum-voltage transition-colors truncate tracking-nav">
            {name}
          </p>
          <p className="text-xs text-smoke mt-0.5">{truncateAddress(address)}</p>
        </div>
        <span className="text-sm text-amber-spark font-medium shrink-0">{rep.toString()} REP</span>
      </div>

      {/* Capabilities */}
      {capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {capabilities.slice(0, 4).map((cap) => (
            <span
              key={cap}
              className="text-xs px-2.5 py-0.5 rounded-2xl border border-white/[0.06] text-smoke"
            >
              {cap}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 pt-3 border-t border-white/[0.04]">
        <div>
          <span className="text-xs text-smoke block">{tasks}</span>
          <span className="text-xs text-smoke/60">tasks</span>
        </div>
        <div>
          <span className="text-xs text-smoke block">{earnedEth}</span>
          <span className="text-xs text-smoke/60">RITUAL</span>
        </div>
        <div className="ml-auto">
          <a
            href={`${EXPLORER_BASE}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-smoke/40 hover:text-plum-voltage transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Explorer ↗
          </a>
        </div>
      </div>
    </Link>
  );
}
