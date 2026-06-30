"use client";

import Link from "next/link";
import { Calendar, MapPin } from "@phosphor-icons/react";
import type { MatchFixture } from "@/lib/fixtures";
import { Button } from "@/components/ui/button";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function MatchCard({ match }: { match: MatchFixture }) {
  const isUpcoming = match.status === "upcoming";

  const question = `Will ${match.homeTeam} win against ${match.awayTeam}?`;
  const prefilledUrl = `/markets/create?question=${encodeURIComponent(question)}&optionA=${encodeURIComponent(`${match.homeTeam} Wins`)}&optionB=${encodeURIComponent(`${match.awayTeam} Wins`)}`;

  return (
    <div className="group flex flex-col gap-4 p-5 rounded-3xl border border-white/[0.08] hover:border-white/[0.12] hover:-translate-y-0.5 transition-all duration-200 card-glow">
      {/* Status badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs-3 text-smoke uppercase tracking-caps">
          Group {match.group} · {match.status === "upcoming" ? "Upcoming" : match.status === "live" ? "🔴 Live" : "FT"}
        </span>
        {isUpcoming && (
          <span className="w-2 h-2 rounded-full bg-lichen" />
        )}
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col items-center gap-1 min-w-0">
          <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-sm text-smoke">
            {match.homeTeam.slice(0, 3).toUpperCase()}
          </div>
          <span className="text-sm text-bone truncate max-w-[80px] text-center">{match.homeTeam}</span>
        </div>

        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <span className="text-xs text-smoke">{formatDate(match.date)}</span>
          <span className="text-lg text-bone font-medium">{formatTime(match.date)}</span>
          <span className="text-xs-3 text-smoke uppercase tracking-caps">VS</span>
        </div>

        <div className="flex flex-col items-center gap-1 min-w-0">
          <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-sm text-smoke">
            {match.awayTeam.slice(0, 3).toUpperCase()}
          </div>
          <span className="text-sm text-bone truncate max-w-[80px] text-center">{match.awayTeam}</span>
        </div>
      </div>

      {/* Venue */}
      <div className="flex items-center gap-1.5 text-xs text-smoke">
        <MapPin size={12} weight="light" />
        {match.venue}
      </div>

      {/* CTA */}
      <Link href={prefilledUrl}>
        <Button variant="primary" size="sm" className="w-full">
          Bet on this match
        </Button>
      </Link>
    </div>
  );
}

/** Grid of match cards with loading/empty states */
export function MatchGrid({ matches }: { matches: MatchFixture[] }) {
  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-base text-smoke">No upcoming matches found.</p>
        <p className="text-xs text-smoke/60 mt-1">Check back closer to match day.</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {matches.map((m) => (
        <MatchCard key={m.id} match={m} />
      ))}
    </div>
  );
}
