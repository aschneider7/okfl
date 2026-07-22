import {buildFfcDraftPool, draftPlayerKey} from "../lib/draftRankings.ts";

const marketPlayers = [
  ...Array.from({length: 160}, (_, index) => ({name: `Skill Player ${index + 1}`, position: index % 4 === 0 ? "QB" : index % 4 === 1 ? "RB" : index % 4 === 2 ? "WR" : "TE", team: "OKF", adp: index + 1})),
  ...Array.from({length: 10}, (_, index) => ({name: `Kicker ${index + 1}`, position: "PK", team: "OKF", adp: 161 + index})),
  ...Array.from({length: 10}, (_, index) => ({name: `Defense ${index + 1}`, position: "DEF", team: "OKF", adp: 171 + index})),
];

const result = buildFfcDraftPool({
  status: "Success",
  meta: {teams: 10, total_drafts: 2000, end_date: "2026-07-20"},
  players: marketPlayers,
}, [{name: "Skill Player 1 Jr.", position: "QB", team: "OLD", pprRank: 999, pprValue: 250, keeperEligible: true}]);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Draft rankings validation failed: ${message}`);
}

assert(result.meta.source === "live", "valid market data should activate the live provider");
assert(result.meta.kickerCount === 10, "PK rows should normalize to ten kickers");
assert(result.meta.defenseCount === 10, "all ten defenses should survive the merge");
assert(result.players[0].marketAdp === 1, "market players should remain sorted by ADP");
assert(result.players.filter((player) => player.position === "QB").slice(0, 5).map((player) => player.okflRank).join(",") === "8,10,18,21,25", "live quarterbacks should receive the recent OKFL selection curve");
assert(result.meta.format.includes("OKFL history curve"), "ranking metadata should identify the OKFL history model");
assert(!result.players.some((player) => player.team === "OLD"), "suffix normalization should prevent duplicate players");
assert(new Set(result.players.map((player) => draftPlayerKey(player.name))).size === result.players.length, "merged player keys must be unique");

console.log({live_players: result.players.length, kickers: result.meta.kickerCount, defenses: result.meta.defenseCount});
