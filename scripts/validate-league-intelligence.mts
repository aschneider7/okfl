import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  archiveLuckGames,
  buildClinchingScenarios,
  buildLuckIndex,
  buildOwnershipIndex,
  buildWaiverHall,
  findOwnershipPlayer,
} from "../lib/leagueIntelligence.ts";
import type {LeagueDashboard,PlayoffOdds} from "../lib/liveLeague.ts";
import type {OKFLData} from "../lib/types.ts";

const data=JSON.parse(readFileSync(new URL("../public/data/okfl.json",import.meta.url),"utf8")) as OKFLData;

const luckGames=archiveLuckGames(data,2025);
const luck=buildLuckIndex(luckGames,data.franchises);
assert.equal(luck.length,10,"Luck Index should score all ten franchises");
assert.ok(luckGames.length>=100,"The 2025 ledger should include a full regular season");
assert.ok(luck.some((row)=>row.luckWins>0)&&luck.some((row)=>row.luckWins<0),"Luck should balance across positive and negative schedules");
assert.ok(Math.abs(luck.reduce((sum,row)=>sum+row.luckWins,0))<0.001,"League luck wins should be zero-sum");

const ownership=buildOwnershipIndex(data);
assert.ok(ownership.length>=500,"Ownership genealogy should cover the historical player archive");
assert.ok(ownership[0].ownerCount>1,"The archive should identify players owned by multiple franchises");
assert.equal(findOwnershipPlayer(ownership,ownership[0].name)?.name,ownership[0].name,"Player search should resolve exact names");

const waiver=buildWaiverHall(data);
assert.equal(waiver.managers.length,10,"Waiver Hall should score all ten franchises");
assert.ok(waiver.claims.length>=500,"Waiver Hall should include historical waiver and free-agent additions");
assert.ok(waiver.managers.every((row)=>row.claims>0),"Every franchise should have an acquisition history");
assert.ok(waiver.claims.every((row)=>Number.isFinite(row.score)&&row.score>=0),"Every acquisition needs a valid score");

const standings=data.franchises.map((franchise,index)=>({
  franchiseId:franchise.id,
  franchise:franchise.name,
  manager:franchise.current_manager,
  wins:Math.max(1,10-index),
  losses:10-Math.max(1,10-index),
  ties:0,
  points:1400-index*45,
  power:90-index*4,
  powerRank:index+1,
  streak:index%2?"L1":"W1",
}));
const dashboard:LeagueDashboard={available:true,syncedAt:null,currentWeek:11,completedWeek:10,standings,matchups:[],awards:[],activity:[]};
const odds:PlayoffOdds[]=standings.map((team,index)=>({franchiseId:team.franchiseId,franchise:team.franchise,playoff:Math.max(0,100-index*11),bye:Math.max(0,50-index*8),first:Math.max(0,30-index*5),champion:Math.max(0,25-index*3),projectedWins:team.wins+2}));
const scenarios=buildClinchingScenarios(dashboard,odds);
assert.equal(scenarios.length,10,"Clinching Paths should cover the entire league");
assert.ok(scenarios.every((row)=>row.winsNeeded>=0&&row.winsNeeded<=4),"Clinching win targets must fit the remaining schedule");
assert.ok(scenarios.some((row)=>row.status==="Clinched"||row.status==="Bye clinched"),"The fixture should produce a mathematical clinch");

console.log(`League Intelligence validation passed: ${luckGames.length} team-games, ${ownership.length} player histories, ${waiver.claims.length} acquisitions, ${scenarios.length} clinching paths.`);
