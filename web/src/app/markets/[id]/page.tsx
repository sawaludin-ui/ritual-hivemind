"use client";

import { useReadContract, useWriteContract, useAccount, useBalance } from "wagmi";
import { useState } from "react";
import { useParams } from "next/navigation";
import { parseEther, formatEther } from "viem";
import {
  PREDIX_MARKET_ADDRESS,
  PREDIX_MARKET_ABI,
  MarketStatus,
  MarketOutcome,
} from "@/lib/predix-contracts";

const STATUS_LABELS: Record<number, string> = {
  0: "Active",
  1: "Closed",
  2: "Resolved",
  3: "Cancelled",
};

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <p className="text-xs text-ash tracking-nav mb-1">{label}</p>
      <p className="text-sm text-bone tabular-nums font-medium">{value}</p>
    </div>
  );
}

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = BigInt(params.id as string);
  const { address } = useAccount();

  const { data: market, isLoading } = useReadContract({
    address: PREDIX_MARKET_ADDRESS,
    abi: PREDIX_MARKET_ABI,
    functionName: "getMarket",
    args: [marketId],
  });

  const { data: odds } = useReadContract({
    address: PREDIX_MARKET_ADDRESS,
    abi: PREDIX_MARKET_ABI,
    functionName: "getOdds",
    args: [marketId],
  });

  const { data: position } = useReadContract({
    address: PREDIX_MARKET_ADDRESS,
    abi: PREDIX_MARKET_ABI,
    functionName: "getPosition",
    args: [marketId, address ?? "0x0000000000000000000000000000000000000000"],
  });

  const { data: balance } = useBalance({ address });
  const { writeContract, isPending } = useWriteContract();

  const [betSide, setBetSide] = useState<1 | 2>(1); // Default to Option A so preview shows immediately
  const [betAmount, setBetAmount] = useState("0.01");

  const previewAmount = betAmount ? parseEther(betAmount) : 0n;
  const { data: preview } = useReadContract({
    address: PREDIX_MARKET_ADDRESS,
    abi: PREDIX_MARKET_ABI,
    functionName: "previewPayout",
    args: [marketId, betSide, previewAmount],
  });

  if (isLoading || !market) {
    return (
      <main className="min-h-screen pt-24 px-6">
        <div className="mx-auto max-w-2xl animate-pulse">
          <div className="h-8 bg-white/[0.04] rounded-lg mb-4" />
          <div className="h-40 bg-white/[0.04] rounded-3xl" />
        </div>
      </main>
    );
  }

  const status = Number(market.status);
  const poolA = Number(formatEther(market.stakedA));
  const poolB = Number(formatEther(market.stakedB));
  const totalPool = poolA + poolB;
  const probA = odds ? Number(odds[0]) / 100 : 50;
  const probB = odds ? Number(odds[1]) / 100 : 50;

  const hasPosition = position && (position.sharesA > 0n || position.sharesB > 0n);
  const isWinner =
    status === MarketStatus.Resolved &&
    position !== undefined &&
    ((Number(market.outcome) === MarketOutcome.OptionA && position.sharesA > 0n) ||
      (Number(market.outcome) === MarketOutcome.OptionB && position.sharesB > 0n));

  const handleBet = () => {
    if (!betAmount) return;
    writeContract({
      address: PREDIX_MARKET_ADDRESS,
      abi: PREDIX_MARKET_ABI,
      functionName: "bet",
      args: [marketId, betSide],
      value: parseEther(betAmount),
    });
  };

  const handleClaim = () => {
    writeContract({
      address: PREDIX_MARKET_ADDRESS,
      abi: PREDIX_MARKET_ABI,
      functionName: "claimWinnings",
      args: [marketId],
    });
  };

  const handleRefund = () => {
    writeContract({
      address: PREDIX_MARKET_ADDRESS,
      abi: PREDIX_MARKET_ABI,
      functionName: "claimRefund",
      args: [marketId],
    });
  };

  const handleSell = (side: number, shares: bigint) => {
    if (shares === 0n) return;
    writeContract({
      address: PREDIX_MARKET_ADDRESS,
      abi: PREDIX_MARKET_ABI,
      functionName: "sellPosition",
      args: [marketId, side, shares],
    });
  };

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="mx-auto max-w-2xl">
        <a href="/markets" className="text-xs text-ash hover:text-bone transition-colors mb-4 inline-block">
          ← Markets
        </a>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-ash tracking-nav">#{market.id.toString()}</span>
            <span className={`text-xs tracking-nav ${status === 0 ? "text-lichen" : status === 2 ? "text-bone" : "text-swarm-fail"}`}>
              {STATUS_LABELS[status]}
            </span>
          </div>
          <h1 className="text-3xl text-bone tracking-tight-display leading-snug">
            {market.question}
          </h1>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatPill label="Pool A" value={`${poolA.toFixed(4)} RIT`} />
          <StatPill label="Pool B" value={`${poolB.toFixed(4)} RIT`} />
          <StatPill label="Total" value={`${totalPool.toFixed(4)} RIT`} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            disabled={status !== MarketStatus.Active}
            onClick={() => setBetSide(1)}
            className={`rounded-3xl border p-5 text-left transition-all ${
              betSide === 1
                ? "border-plum-voltage bg-plum-voltage/10"
                : "border-white/[0.06] bg-white/[0.02] hover:border-plum-voltage/30"
            } ${status !== MarketStatus.Active ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-bone font-medium">{market.optionA}</span>
              <span className="text-lg tabular-nums text-plum-voltage">{probA.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full bg-plum-voltage rounded-full" style={{ width: `${probA}%` }} />
            </div>
          </button>

          <button
            disabled={status !== MarketStatus.Active}
            onClick={() => setBetSide(2)}
            className={`rounded-3xl border p-5 text-left transition-all ${
              betSide === 2
                ? "border-amber-spark bg-amber-spark/10"
                : "border-white/[0.06] bg-white/[0.02] hover:border-amber-spark/30"
            } ${status !== MarketStatus.Active ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-bone font-medium">{market.optionB}</span>
              <span className="text-lg tabular-nums text-amber-spark">{probB.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full bg-amber-spark rounded-full" style={{ width: `${probB}%` }} />
            </div>
          </button>
        </div>

        {status === MarketStatus.Active && (
          <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 mb-6">
            {!address ? (
              <p className="text-ash text-sm text-center py-4">Connect wallet to place a bet</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm text-ash tracking-nav">Bet Amount</label>
                  <span className="text-xs text-ash tabular-nums">
                    Balance: {balance ? Number(formatEther(balance.value)).toFixed(4) : "0"} RIT
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="flex-1 h-12 px-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-bone text-lg tabular-nums outline-none focus:border-plum-voltage/40 transition-colors"
                    placeholder="0.01"
                  />
                  <span className="text-ash text-sm">RITUAL</span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  {["0.001", "0.01", "0.05", "0.1"].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setBetAmount(amt)}
                      className="h-7 px-3 rounded-full text-xs text-ash bg-white/[0.03] border border-white/[0.06] hover:text-bone hover:border-white/20 transition-colors"
                    >
                      {amt}
                    </button>
                  ))}
                </div>
                {preview && preview > 0n && (
                  <div className="rounded-2xl bg-plum-voltage/5 border border-plum-voltage/10 px-4 py-3 mb-4">
                    <p className="text-xs text-ash">
                      If {betSide === 1 ? market.optionA : market.optionB} wins, you get:
                    </p>
                    <p className="text-lg text-bone tabular-nums font-medium">
                      {Number(formatEther(preview)).toFixed(4)} RITUAL
                    </p>
                  </div>
                )}
                <button
                  onClick={handleBet}
                  disabled={!betAmount || isPending}
                  className="w-full h-12 rounded-2xl bg-plum-voltage text-bone font-medium tracking-nav disabled:opacity-40 hover:bg-plum-voltage/90 transition-colors"
                >
                  {isPending ? "Confirming..." : `Bet on ${betSide === 1 ? market.optionA : market.optionB}`}
                </button>
                <p className="text-xs text-ash/60 text-center mt-2">2% fee included</p>
              </>
            )}
          </div>
        )}

        {hasPosition && (
          <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 mb-6">
            <h3 className="text-sm text-ash tracking-nav mb-4">Your Position</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
                <p className="text-xs text-ash mb-1">{market.optionA} shares</p>
                <p className="text-sm text-bone tabular-nums">{position ? Number(formatEther(position.sharesA)).toFixed(4) : "0"}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
                <p className="text-xs text-ash mb-1">{market.optionB} shares</p>
                <p className="text-sm text-bone tabular-nums">{position ? Number(formatEther(position.sharesB)).toFixed(4) : "0"}</p>
              </div>
            </div>
            {status === MarketStatus.Active && (
              <div className="flex gap-2">
                {position && position.sharesA > 0n && (
                  <button
                    onClick={() => handleSell(1, position.sharesA)}
                    disabled={isPending}
                    className="flex-1 h-10 rounded-2xl bg-white/[0.04] text-ash text-sm hover:text-bone hover:bg-white/[0.06] transition-colors disabled:opacity-40"
                  >
                    Sell {market.optionA}
                  </button>
                )}
                {position && position.sharesB > 0n && (
                  <button
                    onClick={() => handleSell(2, position.sharesB)}
                    disabled={isPending}
                    className="flex-1 h-10 rounded-2xl bg-white/[0.04] text-ash text-sm hover:text-bone hover:bg-white/[0.06] transition-colors disabled:opacity-40"
                  >
                    Sell {market.optionB}
                  </button>
                )}
              </div>
            )}
            {status === MarketStatus.Resolved && !position?.claimed && isWinner && (
              <button
                onClick={handleClaim}
                disabled={isPending}
                className="w-full h-12 rounded-2xl bg-lichen text-bone font-medium tracking-nav hover:bg-lichen/90 transition-colors disabled:opacity-40"
              >
                {isPending ? "Claiming..." : "Claim Winnings"}
              </button>
            )}
            {status === MarketStatus.Resolved && position?.claimed && (
              <p className="text-xs text-ash text-center py-2">Winnings claimed</p>
            )}
            {status === MarketStatus.Cancelled && !position?.claimed && (
              <button
                onClick={handleRefund}
                disabled={isPending}
                className="w-full h-12 rounded-2xl bg-amber-spark text-bone font-medium tracking-nav hover:bg-amber-spark/90 transition-colors disabled:opacity-40"
              >
                {isPending ? "Processing..." : "Claim Refund"}
              </button>
            )}
          </div>
        )}

        {status === MarketStatus.Resolved && (
          <div className="rounded-3xl border border-lichen/20 bg-lichen/5 p-6 text-center">
            <p className="text-sm text-ash tracking-nav mb-1">Result</p>
            <p className="text-2xl text-bone font-medium">
              {Number(market.outcome) === MarketOutcome.OptionA ? market.optionA : market.optionB} won
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
