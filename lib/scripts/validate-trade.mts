import {strict as assert} from "node:assert";
import {analyzeFutureTrade, PICK_VALUES, type MarketPlayer} from "../lib/futureTradeAnalyzer.ts";

const market: MarketPlayer = {
  player: "Model Running Back", pos: "RB", team: "OKFL", age: 24,
  ecrPpr: 10, valuePpr: 5000, scrapeDate: "validation",
};

const result = analyzeFutureTrade(
  [{input: {player: market.player, keeperCost: "Round 8", keeperYear: "Year 1"}, market}],
  [{input: {type: "pick", player: "Draft pick", pickYear: 2026, pickRound: 2}}],
  {sideA: {window: "retooling", needs: ["RB"]}, sideB: {window: "contending", needs: []}},
);

assert.equal(result.a.assets[0].kind, "player");
assert.equal(result.b.assets[0].kind, "pick");
assert.equal(result.b.assets[0].pprMarketValue, PICK_VALUES[2]);
assert.ok(result.a.keeperValue > 0, "keeper surplus should be represented");
assert.ok(result.a.contextValue > 0, "youth and roster need should improve team fit");
assert.ok(result.reasons.length > 0, "analysis should explain its verdict");
assert.ok(result.balancer, "an uneven trade should include a balancing suggestion");

console.log({winner: result.winner, grade: result.grade, balancing_round: result.balancer?.round});
