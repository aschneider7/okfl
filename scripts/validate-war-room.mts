import assert from "node:assert/strict";
import {recommendPickRound} from "../lib/tradeWarRoom.ts";

assert.equal(recommendPickRound(8),1,"elite first-round PPR assets can command a first");
assert.equal(recommendPickRound(55),4,"mid-tier starters must not be priced as first-round assets");
assert.equal(recommendPickRound(100),6,"depth targets should be priced in the middle rounds");
assert.equal(recommendPickRound(55,5),3,"documented keeper surplus may raise the price tier without automatically demanding a first");
console.log("Trade War Room pricing protects premium picks and rewards only documented keeper surplus.");
