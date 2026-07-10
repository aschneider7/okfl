import { NextRequest, NextResponse } from "next/server";
import {
  calculateFantasyPoints,
  displayName,
  findBestPlayerMatch,
  parseCsv,
  resolveAlias,
  type ScoringMode,
} from "@/lib/nflFantasy";

export const runtime = "nodejs";

const MIN_SEASON = 1999;
const MAX_WEEK = 22;

function scoringMode(value: string | null): ScoringMode {
  if (value === "standard") return "standard";
  if (value === "half-ppr") return "half-ppr";
  return "ppr";
}

export async function GET(request: NextRequest) {
  const player = request.nextUrl.searchParams.get("player")?.trim() ?? "";
  const season = Number(request.nextUrl.searchParams.get("season"));
  const week = Number(request.nextUrl.searchParams.get("week"));
  const scoring = scoringMode(request.nextUrl.searchParams.get("scoring"));

  if (!player || !Number.isInteger(season) || !Number.isInteger(week)) {
    return NextResponse.json(
      { error: "Provide player, season, and week." },
      { status: 400 },
    );
  }

  const currentYear = new Date().getFullYear();
  if (season < MIN_SEASON || season > currentYear || week < 1 || week > MAX_WEEK) {
    return NextResponse.json(
      { error: "Season or week is outside the supported range." },
      { status: 400 },
    );
  }

  const sourceUrl = `https://github.com/nflverse/nflverse-data/releases/download/player_stats/stats_player_week_${season}.csv`;

  try {
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "OKFL-OS/0.6.2" },
      next: { revalidate: season < currentYear ? 60 * 60 * 24 * 30 : 60 * 15 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `NFL weekly data is unavailable for ${season}.`, sourceUrl },
        { status: 502 },
      );
    }

    const csv = await response.text();
    const rows = parseCsv(csv).filter(
      (row) => Number(row.week) === week && (!row.season_type || row.season_type === "REG"),
    );
    const match = findBestPlayerMatch(rows, player);

    if (!match) {
      return NextResponse.json(
        {
          error: `No weekly stat line found for ${resolveAlias(player)} in ${season} Week ${week}.`,
          sourceUrl,
        },
        { status: 404 },
      );
    }

    const calculation = calculateFantasyPoints(match, scoring);

    return NextResponse.json({
      player: displayName(match),
      requestedPlayer: player,
      season,
      week,
      scoring,
      fantasyPoints: calculation.total,
      team: match.team || null,
      opponent: match.opponent_team || null,
      position: match.position || match.position_group || null,
      stats: calculation,
      source: "nflverse weekly player statistics",
      sourceUrl,
      scoringRules: {
        reception: scoring === "ppr" ? 1 : scoring === "half-ppr" ? 0.5 : 0,
        passingYard: 0.04,
        passingTouchdown: 4,
        interception: -2,
        rushingYard: 0.1,
        receivingYard: 0.1,
        rushingTouchdown: 6,
        receivingTouchdown: 6,
        fumbleLost: -2,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "The live NFL data service could not be reached.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
