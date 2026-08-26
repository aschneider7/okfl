import assert from "node:assert/strict";
import {normalizeRankingKeys,orderPlayersByKeys} from "../lib/personalDraftRankings.ts";

const players=[
  {name:"Player A",position:"RB",team:"AAA",pprRank:1,pprValue:100,keeperEligible:true},
  {name:"Player B",position:"WR",team:"BBB",pprRank:2,pprValue:90,keeperEligible:true},
  {name:"Player C",position:"QB",team:"CCC",pprRank:3,pprValue:80,keeperEligible:true},
];
assert.deepEqual(normalizeRankingKeys(["playerc","playerc","missing"],players),["playerc","playera","playerb"]);
assert.deepEqual(orderPlayersByKeys(players,["playerb"]).map((player)=>player.name),["Player B","Player A","Player C"]);
console.log("Draft Day Command Center validation passed.");
