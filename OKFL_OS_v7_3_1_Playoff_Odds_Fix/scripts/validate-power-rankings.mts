import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildPowerRankings} from "../lib/powerRankings.ts";

const data=JSON.parse(readFileSync(new URL("../public/data/okfl.json",import.meta.url),"utf8"));
const rankings=buildPowerRankings(data);
assert.equal(rankings.length,10,"Power Rankings must include all ten franchises.");
assert.equal(new Set(rankings.map((team)=>team.franchiseId)).size,10,"Power Rankings cannot duplicate a franchise.");
assert.deepEqual(rankings.map((team)=>team.rank),[1,2,3,4,5,6,7,8,9,10],"Ranks must be sequential.");
assert.ok(rankings.every((team)=>team.dimensions.reduce((sum,dimension)=>sum+dimension.weight,0)===100),"Every model must total 100% weight.");
assert.ok(rankings.every((team,index)=>index===0||rankings[index-1].score>=team.score),"Power scores must be descending.");
console.log({power_rankings:rankings.length,leader:rankings[0].franchise,leader_score:rankings[0].score});
