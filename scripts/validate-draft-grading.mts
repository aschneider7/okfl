import {draftExpectedRank, draftReport, pickGrade} from "../lib/draftGrading.ts";
import type {DraftPick, DraftPlayer} from "../lib/draftSimulator.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Draft grading validation failed: ${message}`);
}

function player(name: string, position: string, rank: number): DraftPlayer {
  return {name, position, team: "OKF", pprRank: rank, pprValue: Math.max(250, 10_000 - rank * 50), keeperEligible: true};
}

function picksFor(players: DraftPlayer[], franchiseId: string, keeperIndexes: number[] = []): DraftPick[] {
  return players.map((row, index) => {
    const keeper = keeperIndexes.includes(index);
    const expected = draftExpectedRank(row);
    const overall = keeper ? Math.min(170, expected + 40) : Math.min(170, expected + 5);
    const round = Math.max(1, Math.ceil(overall / 10));
    return {overall, round, slot: 6, franchiseId, manager: franchiseId, player: row, keeper,
      keeperCost: keeper ? round : undefined, grade: keeper ? "K" : pickGrade(row, overall), explanation: []};
  });
}

const balancedPlayers = [
  player("QB One", "QB", 20), player("QB Two", "QB", 55),
  player("RB One", "RB", 10), player("RB Two", "RB", 25), player("RB Three", "RB", 50), player("RB Four", "RB", 80), player("RB Five", "RB", 120),
  player("WR One", "WR", 5), player("WR Two", "WR", 30), player("WR Three", "WR", 60), player("WR Four", "WR", 90), player("WR Five", "WR", 110), player("WR Six", "WR", 140),
  player("TE One", "TE", 40), player("TE Two", "TE", 100), player("K One", "K", 240), player("DEF One", "DEF", 250),
];
const overloadedPlayers = [
  ...Array.from({length: 7}, (_, index) => player(`Bad QB ${index}`, "QB", 45 + index * 8)),
  ...Array.from({length: 4}, (_, index) => player(`Bad TE ${index}`, "TE", 70 + index * 10)),
  ...Array.from({length: 3}, (_, index) => player(`Bad K ${index}`, "K", 230 + index)),
  ...Array.from({length: 2}, (_, index) => player(`Bad DEF ${index}`, "DEF", 240 + index)),
  player("Only WR", "WR", 80),
];
const overloadedPicks = picksFor(overloadedPlayers, "BAD").map((pick) => {
  const overall = Math.max(1, draftExpectedRank(pick.player) - 25);
  return {...pick, overall, round: Math.max(1, Math.ceil(overall / 10)), grade: pickGrade(pick.player, overall)};
});

const balanced = draftReport(picksFor(balancedPlayers, "GOOD", [2, 8, 13]), "GOOD");
const overloaded = draftReport(overloadedPicks, "BAD");

assert(pickGrade(player("Value", "WR", 50), 60) === "A", "a one-round discount should grade as an A");
assert(pickGrade(player("Reach", "WR", 50), 30) === "D", "a two-round reach should grade as a D");
assert(draftExpectedRank(player("Late K", "K", 240)) === 155 && draftExpectedRank(player("Late DEF", "DEF", 250)) === 145, "specialists need realistic draft-window baselines");
assert(balanced.coverage === 100, "a complete lineup should fill all ten starter slots");
assert(balanced.constructionScore >= 90, "balanced RB/WR depth should receive a strong construction score");
assert(overloaded.coverage < balanced.coverage && overloaded.constructionScore < 40, "position hoarding must lose lineup and construction points");
assert(balanced.score >= overloaded.score + 20, "a balanced value draft must clearly beat a reach-heavy, overloaded roster");
assert([balanced.valueScore, balanced.lineupScore, balanced.constructionScore, balanced.keeperScore, balanced.score].every((score) => score >= 0 && score <= 100), "all report components must remain bounded");

console.log({balanced_grade: balanced.grade, balanced_score: balanced.score, overloaded_grade: overloaded.grade, overloaded_score: overloaded.score});
