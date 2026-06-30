"use client";

import { useReadContract, useAccount } from "wagmi";
import Link from "next/link";
import { useState } from "react";
import {
  PREDIX_MARKET_ADDRESS,
  PREDIX_MARKET_ABI,
  MarketStatus,
} from "@/lib/predix-contracts";
import { formatEther } from "viem";

// ── Helpers ──────────────────────────────────────────────
const STATUS_LABELS: Record<number, string> = {
  0: "Active",
  1: "Closed",
  2: "Resolved",
  3: "Cancelled",
};

const STATUS_COLORS: Record<number, string> = {
  0: "text-lichen",
  1: "text-amber-spark",
  2: "text-bone",
  3: "text-swarm-fail",
};

function OddsBar({ probA, probB }: { probA: bigint; probB: bigint }) {
  const a = Number(probA) / 100;
  const b = Number(probB) / 100;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full bg-plum-voltage rounded-full transition-all duration-500"
          style={{ width: `${a}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-ash w-10 text-right">{a.toFixed(0)}%</span>
      <span className="text-xs tabular-nums text-ash w-10">{b.toFixed(0)}%</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full bg-amber-spark rounded-full transition-all duration-500"
          style={{ width: `${b}%`, marginLeft: "auto" }}
        />
      </div>
    </div>
  );
}

// ── Market Card ───────────────────────────────────────────
function MarketCard({ id, filter }: { id: bigint; filter: "all" | "active" | "resolved" }) {
  const { data: market, isLoading } = useReadContract({
    address: PREDIX_MARKET_ADDRESS,
    abi: PREDIX_MARKET_ABI,
    functionName: "getMarket",
    args: [id],
  });

  const { data: odds } = useReadContract({
    address: PREDIX_MARKET_ADDRESS,
    abi: PREDIX_MARKET_ABI,
    functionName: "getOdds",
    args: [id],
  });

  if (isLoading || !market) {
    return null;
  }

  const status = Number(market.status);

  // Client-side filter: skip cards that don't match the selected filter
  if (filter === "active" && status !== 0) return null;
  if (filter === "resolved" && status !== 2) return null;

  const totalPool = (market.stakedA + market.stakedB) / 10n ** 18n;

  return (
    <Link href={`/markets/${id}`} className="group block">
      <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-plum-voltage/30 hover:bg-white/[0.04]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ash mb-1.5 tracking-nav">#{market.id.toString()}</p>
            <h3 className="text-lg text-bone font-medium leading-snug group-hover:text-plum-voltage transition-colors">
              {market.question}
            </h3>
          </div>
          <span className={`text-xs tracking-nav shrink-0 ${STATUS_COLORS[status] ?? "text-ash"}`}>
            {STATUS_LABELS[status] ?? "Unknown"}
          </span>
        </div>

        {/* Options */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 rounded-2xl bg-plum-voltage/10 border border-plum-voltage/20 px-4 py-2.5">
            <p className="text-sm text-bone font-medium">{market.optionA}</p>
          </div>
          <span className="text-xs text-ash">vs</span>
          <div className="flex-1 rounded-2xl bg-amber-spark/10 border border-amber-spark/20 px-4 py-2.5">
            <p className="text-sm text-bone font-medium">{market.optionB}</p>
          </div>
        </div>

        {/* Odds */}
        {odds && status === MarketStatus.Active && (
          <div className="mb-3">
            <OddsBar probA={odds[0]} probB={odds[1]} />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-ash">
          <span className="tabular-nums">
            Pool: {Number(totalPool).toFixed(4)} RITUAL
          </span>
          {status === MarketStatus.Resolved && (
            <span className="text-lichen">
              {Number(market.outcome) === 1 ? market.optionA : market.optionB} won
            </span>
          )}
          {status === MarketStatus.Active && (
            <span className="text-plum-voltage group-hover:translate-x-0.5 transition-transform">
              Bet →
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Filtered Grid (handles empty state per filter) ──
function FilteredGrid({ ids, filter }: { ids: readonly bigint[]; filter: "all" | "active" | "resolved" }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[...ids].reverse().map((id) => (
        <MarketCard key={id} id={id} filter={filter} />
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────
export default function MarketsPage() {
  const { data: marketIds, isLoading } = useReadContract({
    address: PREDIX_MARKET_ADDRESS,
    abi: PREDIX_MARKET_ABI,
    functionName: "getMarketIds",
  });

  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");

  const ids = marketIds ?? [];

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="mx-auto max-w-page">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl text-bone tracking-tight-display mb-2">
            Prediction Markets
          </h1>
          <p className="text-ash text-base">
            Create and bet on any outcome — sports, crypto, politics, or your own custom question.
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 mb-8">
          {(["all", "active", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-8 px-4 rounded-full text-sm tracking-nav capitalize transition-colors ${
                filter === f
                  ? "bg-plum-voltage/20 text-bone border border-plum-voltage/40"
                  : "bg-white/[0.03] text-ash border border-white/[0.06] hover:text-bone"
              }`}
            >
              {f}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-4">
            <span className="text-xs text-ash tabular-nums">{ids.length} markets</span>
            <Link href="/markets/create">
              <button className="h-8 px-4 rounded-full text-sm tracking-nav bg-plum-voltage/20 text-bone border border-plum-voltage/40 hover:bg-plum-voltage/30 transition-colors">
                + Create Market
              </button>
            </Link>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse h-44" />
            ))}
          </div>
        ) : ids.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-white/[0.08] flex items-center justify-center">
              <span className="text-3xl">📊</span>
            </div>
            <h3 className="text-2xl text-bone mb-2">No markets yet</h3>
            <p className="text-base text-ash max-w-[360px] mb-6 leading-relaxed">
              Prediction markets will appear here once created. Bet on outcomes with
              AI-agent-driven insights.
            </p>
          </div>
        ) : (
          <FilteredGrid ids={ids} filter={filter} />
        )}

        {/* No results from filter */}
        {!isLoading && ids.length > 0 && filter !== "all" && (
          <p className="text-xs text-smoke text-center mt-4">
            Showing {filter} markets only
          </p>
        )}
      </div>
    </main>
  );
}
