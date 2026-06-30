"use client";

import { useState } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { Badge } from "@/components/ui/badge";
import {
  PREDIX_MARKET_ADDRESS,
  PREDIX_MARKET_ABI,
  MarketStatus,
} from "@/lib/predix-contracts";
import { truncateAddress } from "@/lib/utils";
import {
  Trophy,
  ArrowsDownUp,
  Medal,
  WifiSlash,
  ChartBar,
  Lightning,
} from "@phosphor-icons/react";

type SortKey = "volume" | "bettors" | "resolved";

export default function LeaderboardPage() {
  const [sortKey, setSortKey] = useState<SortKey>("volume");

  const {
    data: marketIds,
    isLoading,
    isError,
  } = useReadContract({
    address: PREDIX_MARKET_ADDRESS,
    abi: PREDIX_MARKET_ABI,
    functionName: "getMarketIds",
  });

  const ids = marketIds ?? [];

  return (
    <div className="pt-16 animate-page-in">
      <div className="mx-auto max-w-page px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs-3 text-amber-spark uppercase tracking-caps mb-3">
            <Trophy size={14} weight="light" />
            Rankings
          </div>
          <h1 className="text-4xl text-bone tracking-tight-display">Leaderboard</h1>
          <p className="text-base text-ash mt-1">
            Top markets by volume, bettor count, and resolution status
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 mb-6 pb-6 border-b border-white/[0.04]">
          <ArrowsDownUp size={14} weight="light" className="text-smoke" />
          <span className="text-xs-3 text-smoke uppercase tracking-caps mr-2">Sort by</span>
          {([
            ["volume", "Volume"],
            ["bettors", "Bettors"],
            ["resolved", "Resolved"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={`text-xs-3 tracking-caps uppercase px-4 py-2 rounded-3xl transition-all duration-150 ${
                sortKey === key
                  ? "bg-amber-spark/10 text-amber-spark border border-amber-spark/30"
                  : "text-smoke border border-white/[0.08] hover:text-bone hover:border-white/[0.12]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-3xl border border-white/[0.08] animate-pulse"
              >
                <div className="w-8 h-8 rounded-full skeleton" />
                <div className="flex-1">
                  <div className="h-5 w-48 rounded skeleton mb-2" />
                  <div className="h-3 w-24 rounded skeleton" />
                </div>
                <div className="h-5 w-20 rounded skeleton" />
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
            <p className="text-base text-smoke">Unable to load leaderboard.</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && ids.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-white/[0.08] flex items-center justify-center">
              <Trophy size={32} weight="light" className="text-smoke" />
            </div>
            <h3 className="text-2xl text-bone mb-2">No markets yet</h3>
            <p className="text-base text-ash max-w-[360px] mb-6 leading-relaxed">
              Once markets are created and bets are placed, top markets will appear
              here ranked by volume and bettor activity.
            </p>
            <Link
              href="/markets/create"
              className="text-sm text-plum-voltage tracking-nav hover:underline"
            >
              Create the first market →
            </Link>
          </div>
        )}

        {/* Market rows */}
        {!isLoading && !isError && ids.length > 0 && (
          <div className="flex flex-col gap-2">
            {/* Header row */}
            <div className="hidden sm:grid grid-cols-[48px_1fr_140px_120px_100px] gap-4 px-4 pb-2 border-b border-white/[0.04]">
              <span className="text-xs-3 text-smoke uppercase tracking-caps">#</span>
              <span className="text-xs-3 text-smoke uppercase tracking-caps">Market</span>
              <span className="text-xs-3 text-smoke uppercase tracking-caps text-right">Volume</span>
              <span className="text-xs-3 text-smoke uppercase tracking-caps text-right">Bettors</span>
              <span className="text-xs-3 text-smoke uppercase tracking-caps text-right">Status</span>
            </div>

            {ids.map((id, index) => (
              <LeaderboardRow
                key={id}
                id={id}
                rank={index + 1}
                sortKey={sortKey}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LeaderboardRow({
  id,
  rank,
  sortKey,
}: {
  id: bigint;
  rank: number;
  sortKey: SortKey;
}) {
  const { data: market } = useReadContract({
    address: PREDIX_MARKET_ADDRESS,
    abi: PREDIX_MARKET_ABI,
    functionName: "getMarket",
    args: [id],
  });

  const { data: bettorCount } = useReadContract({
    address: PREDIX_MARKET_ADDRESS,
    abi: PREDIX_MARKET_ABI,
    functionName: "getBettorCount",
    args: [id],
  });

  if (!market) return null;

  const volume = (market.stakedA + market.stakedB) / 10n ** 18n;
  const volumeDisplay = Number(volume).toFixed(4);
  const bettors = bettorCount ? Number(bettorCount) : 0;
  const status = Number(market.status);
  const isResolved = status === MarketStatus.Resolved;

  const rankColor =
    rank === 1
      ? "text-amber-spark"
      : rank === 2
        ? "text-ash"
        : rank === 3
          ? "text-plum-voltage"
          : "text-smoke";

  return (
    <Link
      href={`/markets/${id}`}
      className={`group grid grid-cols-[48px_1fr_140px_120px_100px] gap-4 items-center px-4 py-4 rounded-3xl transition-all duration-200 ${
        rank <= 3
          ? "border border-white/[0.08] hover:border-white/[0.12]"
          : "border border-transparent hover:border-white/[0.08]"
      }`}
    >
      {/* Rank */}
      <span className={`text-lg text-bone tracking-tight-display ${rankColor}`}>
        {rank}
      </span>

      {/* Market question */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-plum-voltage/10 border border-plum-voltage/20 flex items-center justify-center shrink-0">
          <ChartBar size={16} weight="light" className="text-plum-voltage" />
        </div>
        <div className="min-w-0">
          <p className="text-base text-bone group-hover:text-plum-voltage transition-colors truncate">
            {market.question}
          </p>
          <p className="text-xs text-smoke tracking-body truncate">
            {market.optionA} vs {market.optionB}
          </p>
        </div>
      </div>

      {/* Volume */}
      <span
        className={`text-right tracking-body text-base tabular-nums ${
          sortKey === "volume" ? "text-bone" : "text-ash"
        }`}
      >
        {volumeDisplay} RITUAL
      </span>

      {/* Bettors */}
      <span
        className={`text-right tracking-body text-base tabular-nums ${
          sortKey === "bettors" ? "text-bone" : "text-ash"
        }`}
      >
        {bettors}
      </span>

      {/* Status */}
      <div className="text-right">
        {status === MarketStatus.Active && (
          <span className="inline-flex items-center gap-1 text-xs text-lichen">
            <Lightning size={10} weight="fill" />
            Active
          </span>
        )}
        {status === MarketStatus.Resolved && (
          <Badge variant="gold">Resolved</Badge>
        )}
        {status === MarketStatus.Closed && (
          <span className="text-xs text-amber-spark">Closed</span>
        )}
        {status === MarketStatus.Cancelled && (
          <span className="text-xs text-swarm-fail">Cancelled</span>
        )}
      </div>
    </Link>
  );
}
