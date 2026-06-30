/**
 * World Cup 2026 fixtures — fetches live data from TheSportsDB (free tier).
 *
 * TheSportsDB free tier API key is "3" (rate-limited, public).
 * For production, upgrade to Patreon tier or swap to API-Football.
 *
 * World Cup 2026: June 11 – July 19, 2026
 * TheSportsDB league id for FIFA World Cup = 4429
 */

export interface MatchFixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string; // ISO 8601
  group: string;
  venue: string;
  status: "upcoming" | "live" | "finished";
  homeScore?: number;
  awayScore?: number;
  homeTeamBadge?: string;
  awayTeamBadge?: string;
}

/** Fallback seed data when API is unavailable */
const SEED_MATCHES: MatchFixture[] = [
  {
    id: "wc2026-01",
    homeTeam: "USA",
    awayTeam: "TBD",
    date: "2026-06-11T20:00:00Z",
    group: "A",
    venue: "MetLife Stadium, New Jersey",
    status: "upcoming",
  },
  {
    id: "wc2026-02",
    homeTeam: "Argentina",
    awayTeam: "TBD",
    date: "2026-06-12T17:00:00Z",
    group: "B",
    venue: "Estadio Azteca, Mexico City",
    status: "upcoming",
  },
  {
    id: "wc2026-03",
    homeTeam: "Brazil",
    awayTeam: "TBD",
    date: "2026-06-13T20:00:00Z",
    group: "C",
    venue: "SoFi Stadium, Los Angeles",
    status: "upcoming",
  },
  {
    id: "wc2026-04",
    homeTeam: "France",
    awayTeam: "TBD",
    date: "2026-06-14T17:00:00Z",
    group: "D",
    venue: "AT&T Stadium, Dallas",
    status: "upcoming",
  },
  {
    id: "wc2026-05",
    homeTeam: "England",
    awayTeam: "TBD",
    date: "2026-06-15T20:00:00Z",
    group: "E",
    venue: "Mercedes-Benz Stadium, Atlanta",
    status: "upcoming",
  },
  {
    id: "wc2026-06",
    homeTeam: "Spain",
    awayTeam: "TBD",
    date: "2026-06-16T17:00:00Z",
    group: "F",
    venue: "BC Place, Vancouver",
    status: "upcoming",
  },
];

interface TheSportsDBEvent {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  dateEvent: string;
  strTime: string;
  strVenue: string;
  strStatus: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strHomeTeamBadge?: string;
  strAwayTeamBadge?: string;
}

function mapEvent(e: TheSportsDBEvent): MatchFixture {
  const dateStr = `${e.dateEvent}T${e.strTime || "00:00:00"}Z`;
  const rawStatus = (e.strStatus || "").toLowerCase();
  let status: MatchFixture["status"] = "upcoming";
  if (rawStatus.includes("live") || rawStatus.includes("1h") || rawStatus.includes("2h")) {
    status = "live";
  } else if (rawStatus.includes("ft") || rawStatus.includes("finished") || rawStatus.includes("aet") || rawStatus.includes("pen")) {
    status = "finished";
  }

  return {
    id: e.idEvent,
    homeTeam: e.strHomeTeam,
    awayTeam: e.strAwayTeam,
    date: dateStr,
    group: "",
    venue: e.strVenue || "TBD",
    status,
    homeScore: e.intHomeScore ? Number(e.intHomeScore) : undefined,
    awayScore: e.intAwayScore ? Number(e.intAwayScore) : undefined,
    homeTeamBadge: e.strHomeTeamBadge || undefined,
    awayTeamBadge: e.strAwayTeamBadge || undefined,
  };
}

export async function getMatches(): Promise<MatchFixture[]> {
  const apiKey = process.env.SPORTSDB_API_KEY || "3";

  try {
    // Fetch World Cup 2026 events (league id 4429, season 2026)
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${apiKey}/eventsseason.php?id=4429&s=2026`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      console.warn(`TheSportsDB returned ${res.status}, using seed data`);
      return SEED_MATCHES;
    }

    const json = await res.json();
    const events: TheSportsDBEvent[] | null = json?.events;

    if (!events || events.length === 0) {
      console.warn("TheSportsDB returned no events, using seed data");
      return SEED_MATCHES;
    }

    return events
      .filter((e) => e.strStatus !== "FT" && e.strStatus !== "AET" && e.strStatus !== "PEN")
      .map(mapEvent)
      .slice(0, 12);
  } catch (err) {
    console.warn("TheSportsDB fetch failed, using seed data:", err);
    return SEED_MATCHES;
  }
}
