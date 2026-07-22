import {buildSleeperDraftPool, draftPlayerKey} from "../lib/draftRankings.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Draft rankings validation failed: ${message}`);
}

const fallback = [
  ...Array.from({length: 10}, (_, index) => ({name: `Kicker ${index + 1}`, position: "K", team: "OKF", pprRank: 230 + index, pprValue: 500, keeperEligible: true})),
  ...Array.from({length: 10}, (_, index) => ({name: `Defense ${index + 1}`, position: "DEF", team: "OKF", pprRank: 240 + index, pprValue: 400, keeperEligible: true})),
];
const skillRows = Array.from({length: 180}, (_, index) => ({
  player: {first_name: `Skill${index + 1}`, last_name: "Player", position: index % 3 === 0 ? "RB" : index % 3 === 1 ? "WR" : "TE", team: "OKF"},
  stats: {adp_ppr: index + 1},
}));
const quarterbackRows = [
  ["Josh", "Allen", 28.2], ["Lamar", "Jackson", 37.9], ["Drake", "Maye", 51.2],
  ["Joe", "Burrow", 57.1], ["Jayden", "Daniels", 62.1], ["Jalen", "Hurts", 67.2],
  ["Jaxson", "Dart", 80.6], ["Caleb", "Williams", 82.9], ["Justin", "Herbert", 83.7],
  ["Dak", "Prescott", 90.3], ["Patrick", "Mahomes", 100.1], ["Brock", "Purdy", 110.1],
  ...Array.from({length: 13}, (_, index) => [`Quarterback${index + 13}`, "Player", 120 + index * 5] as [string, string, number]),
].map(([first_name, last_name, adp_ppr]) => ({player: {first_name, last_name, position: "QB", team: "OKF"}, stats: {adp_ppr}}));

const result = buildSleeperDraftPool([...skillRows, ...quarterbackRows], fallback);
const byName = new Map(result.players.map((player) => [player.name, player]));

assert(result.meta.source === "live", "valid Sleeper data should activate the live provider");
assert(result.meta.sourceLabel === "Sleeper full-PPR ADP", "metadata should identify the full-PPR source");
assert(result.meta.kickerCount === 10 && result.meta.defenseCount === 10, "fallback specialists should complete the board");
assert(byName.get("Dak Prescott")?.marketAdp === 90.3, "the current PPR market ADP must be preserved");
assert(byName.get("Dak Prescott")?.okflRank === 63, "Dak should follow the available-QB tier formula, not a manual anchor");
assert(byName.get("Lamar Jackson")?.okflRank === 20, "elite QB timing should come from the historical multiplier");
assert(byName.get("Drake Maye")?.okflRank === undefined && byName.get("Jaxson Dart")?.okflRank === undefined, "projected QB keepers must be excluded before tier assignment");
const availableQbs = result.players.filter((player) => player.position === "QB" && player.okflRank !== undefined).sort((a, b) => (a.marketAdp || 999) - (b.marketAdp || 999));
assert(availableQbs.every((player, index) => index === 0 || (player.okflRank || 0) > (availableQbs[index - 1].okflRank || 0)), "adjusted QB ranks must preserve current PPR market order");
assert(new Set(result.players.map((player) => draftPlayerKey(player.name))).size === result.players.length, "player keys must be unique");

console.log({live_players: result.players.length, dak_adjusted_rank: byName.get("Dak Prescott")?.okflRank, kickers: result.meta.kickerCount, defenses: result.meta.defenseCount});
