import {NextResponse} from "next/server";
import {fallbackPprPool} from "@/lib/draftSimulator";
import {buildSleeperDraftPool, fallbackRankingsMeta} from "@/lib/draftRankings";

const RANKINGS_URL = "https://api.sleeper.com/projections/nfl/2026?season_type=regular";

export async function GET() {
  const fallback = fallbackPprPool();
  try {
    const response = await fetch(RANKINGS_URL, {
      headers: {Accept: "application/json", "User-Agent": "OKFL-OS/4.2"},
      next: {revalidate: 43_200},
    });
    if (!response.ok) throw new Error(`Rankings request failed with ${response.status}.`);
    return NextResponse.json(buildSleeperDraftPool(await response.json(), fallback), {
      headers: {"Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400"},
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live rankings are temporarily unavailable.";
    return NextResponse.json({players: fallback, meta: fallbackRankingsMeta(fallback, message)}, {
      headers: {"Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600"},
    });
  }
}
