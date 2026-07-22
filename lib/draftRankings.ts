import {applyOkflHistoricalQuarterbackCurve} from "./draftHistory.ts";
import type {DraftPlayer} from "./draftSimulator.ts";

export type DraftRankingsMeta = {
  source: "live" | "fallback";
  sourceLabel: string;
  sourceUrl: string;
  scoring: "PPR";
  format: string;
  updatedAt: string | null;
  totalDrafts: number | null;
  playerCount: number;
  kickerCount: number;
  defenseCount: number;
  message?: string;
};

export type DraftRankingsResponse = {
  players: DraftPlayer[];
  meta: DraftRankingsMeta;
};

type SleeperProjection = {
  player?: {
    first_name?: unknown;
    last_name?: unknown;
    position?: unknown;
    team?: unknown;
  };
  stats?: {adp_ppr?: unknown};
};

export function draftPlayerKey(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizePosition(position: unknown) {
  const value = String(position || "").toUpperCase();
  if (value === "PK") return "K";
  if (value === "DST" || value === "D/ST" || value === "D") return "DEF";
  return value;
}

function rankValue(rank: number) {
  return Math.max(250, 10_050 - rank * 50);
}

export function fallbackRankingsMeta(players: DraftPlayer[], message?: string): DraftRankingsMeta {
  return {
    source: "fallback",
    sourceLabel: "OKFL offline PPR board",
    sourceUrl: "",
    scoring: "PPR",
    format: "10-team OKFL keeper",
    updatedAt: null,
    totalDrafts: null,
    playerCount: players.length,
    kickerCount: players.filter((player) => player.position === "K").length,
    defenseCount: players.filter((player) => player.position === "DEF").length,
    message,
  };
}

export function buildSleeperDraftPool(payload: unknown, fallback: DraftPlayer[]): DraftRankingsResponse {
  if (!Array.isArray(payload)) throw new Error("Sleeper returned an invalid projections response.");

  const fallbackByKey = new Map(fallback.map((player) => [draftPlayerKey(player.name), player]));
  const seen = new Set<string>();
  const skillPlayers = (payload as SleeperProjection[])
    .map((row) => {
      const name = `${String(row.player?.first_name || "").trim()} ${String(row.player?.last_name || "").trim()}`.trim();
      const position = normalizePosition(row.player?.position);
      const team = String(row.player?.team || "FA").trim().toUpperCase();
      const marketAdp = Number(row.stats?.adp_ppr);
      if (!name || !["QB", "RB", "WR", "TE"].includes(position) || !Number.isFinite(marketAdp) || marketAdp >= 999) return null;
      const key = draftPlayerKey(name);
      if (!key || seen.has(key)) return null;
      seen.add(key);
      const archived = fallbackByKey.get(key);
      return {
        name,
        position,
        team,
        pprRank: 0,
        pprValue: 0,
        marketAdp,
        age: archived?.age ?? null,
        keeperEligible: archived?.keeperEligible ?? true,
        source: "sleeper-live-ppr-adp",
      } satisfies DraftPlayer;
    })
    .filter((player): player is NonNullable<typeof player> => Boolean(player))
    .sort((a, b) => (a.marketAdp || Number.MAX_SAFE_INTEGER) - (b.marketAdp || Number.MAX_SAFE_INTEGER));

  if (skillPlayers.length < 180 || skillPlayers.filter((player) => player.position === "QB").length < 20) {
    throw new Error("Sleeper's full-PPR board did not include enough active players.");
  }

  // Sleeper's projection ADP does not rank K/DEF, so retain the curated OKFL
  // fallback rows after the live skill-position market.
  const specialists = fallback
    .filter((player) => (player.position === "K" || player.position === "DEF") && !seen.has(draftPlayerKey(player.name)))
    .sort((a, b) => a.pprRank - b.pprRank);
  const ranked = [...skillPlayers, ...specialists].map((player, index) => ({
    ...player,
    pprRank: index + 1,
    pprValue: rankValue(index + 1),
  }));
  const players = applyOkflHistoricalQuarterbackCurve(ranked);
  const kickerCount = players.filter((player) => player.position === "K").length;
  const defenseCount = players.filter((player) => player.position === "DEF").length;
  if (kickerCount < 10 || defenseCount < 10) throw new Error("The draft board needs at least ten kickers and defenses.");

  return {
    players,
    meta: {
      source: "live",
      sourceLabel: "Sleeper full-PPR ADP",
      sourceUrl: "https://api.sleeper.com/projections/nfl/2026?season_type=regular",
      scoring: "PPR",
      format: "10-team PPR market x OKFL 2023-25 premium",
      updatedAt: new Date().toISOString(),
      totalDrafts: null,
      playerCount: players.length,
      kickerCount,
      defenseCount,
    },
  };
}
