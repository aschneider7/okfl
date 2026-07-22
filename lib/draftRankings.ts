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

type FfcPlayer = {
  name?: unknown;
  position?: unknown;
  team?: unknown;
  adp?: unknown;
  times_drafted?: unknown;
  stdev?: unknown;
};

type FfcPayload = {
  status?: unknown;
  meta?: {
    type?: unknown;
    teams?: unknown;
    total_drafts?: unknown;
    end_date?: unknown;
  };
  players?: FfcPlayer[];
};

const SUPPORTED_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);

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

export function buildFfcDraftPool(payload: FfcPayload, fallback: DraftPlayer[]): DraftRankingsResponse {
  if (payload.status !== "Success" || !Array.isArray(payload.players)) {
    throw new Error("The rankings provider returned an invalid response.");
  }

  const fallbackByKey = new Map(fallback.map((player) => [draftPlayerKey(player.name), player]));
  const seen = new Set<string>();
  const livePlayers = payload.players
    .map((row) => {
      const name = String(row.name || "").trim();
      const position = normalizePosition(row.position);
      const team = String(row.team || "FA").trim().toUpperCase();
      const marketAdp = Number(row.adp);
      if (!name || !SUPPORTED_POSITIONS.has(position) || !Number.isFinite(marketAdp)) return null;
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
        source: "ffc-live-ppr-adp",
      } satisfies DraftPlayer;
    })
    .filter((player): player is NonNullable<typeof player> => Boolean(player))
    .sort((a, b) => (a.marketAdp || Number.MAX_SAFE_INTEGER) - (b.marketAdp || Number.MAX_SAFE_INTEGER));

  const liveKickerCount = livePlayers.filter((player) => player.position === "K").length;
  const liveDefenseCount = livePlayers.filter((player) => player.position === "DEF").length;
  if (livePlayers.length < 180 || liveKickerCount < 10 || liveDefenseCount < 10) {
    throw new Error("The live PPR board did not include enough players, kickers, or defenses.");
  }

  const players = applyOkflHistoricalQuarterbackCurve(livePlayers.map((player, index) => ({
    ...player,
    pprRank: index + 1,
    pprValue: rankValue(index + 1),
  })));

  const teams = Number(payload.meta?.teams);
  const totalDrafts = Number(payload.meta?.total_drafts);
  return {
    players,
    meta: {
      source: "live",
      sourceLabel: "Fantasy Football Calculator",
      sourceUrl: "https://fantasyfootballcalculator.com/adp/ppr/10-team/all",
      scoring: "PPR",
      format: `${Number.isFinite(teams) ? teams : 10}-team PPR + OKFL history curve`,
      updatedAt: typeof payload.meta?.end_date === "string" ? payload.meta.end_date : new Date().toISOString(),
      totalDrafts: Number.isFinite(totalDrafts) ? totalDrafts : null,
      playerCount: players.length,
      kickerCount: liveKickerCount,
      defenseCount: liveDefenseCount,
    },
  };
}
