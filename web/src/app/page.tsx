"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { MatchGrid } from "@/components/match-card";
import type { MatchFixture } from "@/lib/fixtures";
import {
  PREDIX_MARKET_ADDRESS,
  PREDIX_MARKET_ABI,
} from "@/lib/predix-contracts";

export default function LandingPage() {
  // --- Live on-chain stats from PREDIX ---
  const { data: marketCountData, isLoading: marketsLoading } = useReadContract({
    address: PREDIX_MARKET_ADDRESS,
    abi: PREDIX_MARKET_ABI,
    functionName: "marketCount",
  });

  const { data: marketIdsData } = useReadContract({
    address: PREDIX_MARKET_ADDRESS,
    abi: PREDIX_MARKET_ABI,
    functionName: "getMarketIds",
  });

  const totalMarkets = marketCountData ? Number(marketCountData) : 0;
  const activeMarkets = marketIdsData ? marketIdsData.length : 0;

  // Fetch World Cup matches
  const [matches, setMatches] = useState<MatchFixture[]>([]);
  const [matchesLoading_, setMatchesLoading] = useState(true);
  useEffect(() => {
    fetch("/api/fixtures")
      .then((r) => r.json())
      .then((d) => setMatches(d.matches ?? []))
      .catch(() => {})
      .finally(() => setMatchesLoading(false));
  }, []);

  return (
    <div className="animate-page-in">
      {/* ===== HERO (centered) ===== */}
      <section className="min-h-screen flex items-center justify-center pt-16">
        <div className="mx-auto max-w-page px-6 w-full">
          <div className="flex flex-col items-center text-center gap-6 max-w-[760px] mx-auto">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 text-xs-3 text-plum-voltage uppercase tracking-caps">
              <span className="w-2 h-2 rounded-full bg-plum-voltage animate-pulse-dot" />
              Live on Ritual Testnet
            </div>

            {/* Headline */}
            <h1 className="text-display text-bone tracking-tight-display">
              Bet on anything, on-chain.
            </h1>

            {/* Body */}
            <p className="text-base text-ash leading-relaxed max-w-[560px]">
              HIVEMIND is a decentralized prediction market on Ritual. Create markets,
              bet on outcomes, and earn from correct predictions. Every trade is
              on-chain, transparent, and censorship-resistant.
            </p>

            {/* CTA Pills */}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link href="/markets/create">
                <Button variant="primary" size="lg">
                  Create a Market
                </Button>
              </Link>
              <Link href="/markets">
                <Button variant="outline" size="lg">
                  Browse Markets
                </Button>
              </Link>
            </div>

            {/* Stats row — live from PREDIX contract */}
            <div className="flex items-center justify-center gap-12 pt-6 mt-2 border-t border-white/[0.04]">
              {marketsLoading ? (
                <>
                  <div className="flex flex-col gap-1 items-center">
                    <div className="h-7 w-12 rounded skeleton" />
                    <div className="h-3 w-20 rounded skeleton" />
                  </div>
                  <div className="flex flex-col gap-1 items-center">
                    <div className="h-7 w-12 rounded skeleton" />
                    <div className="h-3 w-24 rounded skeleton" />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-2xl text-bone tabular-nums">{activeMarkets}</span>
                    <span className="text-xs text-smoke">Active Markets</span>
                  </div>
                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-2xl text-bone tabular-nums">{totalMarkets}</span>
                    <span className="text-xs text-smoke">Total Created</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURED CATEGORIES ===== */}
      <section className="py-60 border-t border-white/[0.04]">
        <div className="mx-auto max-w-page px-6">
          <div className="mb-12">
            <h2 className="text-4xl text-bone tracking-tight-display mb-2">
              Bet on what matters
            </h2>
            <p className="text-base text-ash">
              Sports, crypto, politics, or your own custom question. If it has an outcome,
              you can bet on it.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CategoryCard
              icon="⚽"
              label="Sports"
              description="World Cup, Champions League, UFC, and more"
              href="/markets"
            />
            <CategoryCard
              icon="📈"
              label="Crypto"
              description="BTC price milestones, token launches, TVL rankings"
              href="/markets"
            />
            <CategoryCard
              icon="🗳️"
              label="Politics"
              description="Elections, regulations, policy outcomes"
              href="/markets"
            />
            <CategoryCard
              icon="🎯"
              label="Custom"
              description="Create your own market on any verifiable outcome"
              href="/markets/create"
            />
          </div>
        </div>
      </section>

      {/* ===== WORLD CUP 2026 ===== */}
      <section className="py-60 border-t border-white/[0.04]">
        <div className="mx-auto max-w-page px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs-3 text-amber-spark uppercase tracking-caps mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-spark" />
                FIFA World Cup 2026
              </div>
              <h2 className="text-4xl text-bone tracking-tight-display">
                Upcoming Matches
              </h2>
            </div>
          </div>

          {matchesLoading_ ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-3xl border border-white/[0.08] p-5 h-56 animate-pulse" />
              ))}
            </div>
          ) : (
            <MatchGrid matches={matches.slice(0, 6)} />
          )}

          <div className="mt-6 text-center">
            <Link href="/markets/create">
              <Button variant="ghost" size="sm">
                Create a custom market →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-60 border-t border-white/[0.04]">
        <div className="mx-auto max-w-page px-6">
          <div className="mb-12">
            <h2 className="text-4xl text-bone tracking-tight-display">
              How it works
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <FeatureRow
              step="01"
              title="Create a Market"
              description="Define a question with two outcomes, set a deadline. Anyone can create a market — no approval needed."
              href="/markets/create"
            />
            <FeatureRow
              step="02"
              title="Place Your Bet"
              description="Buy shares on the outcome you believe will happen. Prices adjust dynamically based on supply and demand."
              href="/markets"
            />
            <FeatureRow
              step="03"
              title="Trade or Hold"
              description="Sell your position anytime before the market closes. Lock in profits or cut losses — it's your call."
              href="/markets"
            />
            <FeatureRow
              step="04"
              title="Resolve & Claim"
              description="When the deadline hits, the market resolves. Correct predictions earn payouts from the losing pool."
              href="/leaderboard"
            />
          </div>
        </div>
      </section>

      {/* ===== BUILT ON RITUAL ===== */}
      <section className="py-60 border-t border-white/[0.04]">
        <div className="mx-auto max-w-page px-6 text-center">
          <h2 className="text-xs-3 text-smoke uppercase tracking-caps mb-8">
            Built on Ritual
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <TechBadge label="On-Chain" description="Chain 1979" />
            <TechBadge label="Zero Oracle" description="Manual Resolve" />
            <TechBadge label="Low Fees" description="RITUAL Gas" />
          </div>

          <p className="mt-10 text-base text-smoke max-w-[520px] mx-auto leading-relaxed">
            HIVEMIND runs entirely on Ritual — an AI-native blockchain with built-in
            precompiles for inference and verifiable compute. No off-chain oracles,
            no trusted servers. Every bet is transparent and censorship-resistant.
          </p>

          <div className="mt-8">
            <Link href="/markets/create">
              <Button variant="primary" size="lg">
                Create your first market
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Category Card ──
function CategoryCard({
  icon,
  label,
  description,
  href,
}: {
  icon: string;
  label: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 p-6 rounded-3xl border border-white/[0.08] hover:border-white/[0.12] hover:-translate-y-0.5 transition-all duration-200 card-glow"
    >
      <span className="text-3xl">{icon}</span>
      <h3 className="text-lg-2 text-bone">{label}</h3>
      <p className="text-sm-2 text-smoke leading-relaxed">{description}</p>
    </Link>
  );
}

function FeatureRow({
  step,
  title,
  description,
  href,
}: {
  step: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-6 p-6 rounded-3xl border border-white/[0.08] hover:border-white/[0.12] hover:-translate-y-0.5 transition-all duration-200 card-glow"
    >
      <div className="flex-1">
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-xs text-smoke tracking-body">{step}</span>
          <h3 className="text-lg-2 text-bone">{title}</h3>
        </div>
        <p className="text-base text-ash leading-relaxed">{description}</p>
      </div>
    </Link>
  );
}

function TechBadge({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-4 rounded-3xl border border-white/[0.08]">
      <span className="text-base text-bone">{label}</span>
      <span className="text-xs text-smoke tracking-body">{description}</span>
    </div>
  );
}


