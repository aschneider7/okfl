import assert from "node:assert/strict";
import {buildLeagueDashboard,simulatePlayoffOdds} from "../lib/liveLeague.ts";

const franchises=Array.from({length:10},(_,index)=>({id:`F${String(index+1).padStart(2,"0")}`,name:`Team ${index+1}`,display_name:`Team ${index+1}`,current_manager:`Manager ${index+1}`,original_manager:`Manager ${index+1}`}));
const power=franchises.map((team,index)=>({rank:index+1,franchiseId:team.id,franchise:team.name,manager:team.current_manager,score:90-index*5,tier:"Contender",movement:0,previousRank:index+1,record:"0-0",dimensions:[],strength:{key:"power",label:"Power",score:90-index*5,weight:100,detail:"Test"},concern:{key:"power",label:"Power",score:90-index*5,weight:100,detail:"Test"},summary:"Test"}));
const rosters=franchises.map((team,index)=>({roster_id:index+1,franchise_id:team.id,franchise:team.name,settings:{wins:index<5?1:0,losses:index<5?0:1,fpts:120-index,fpts_decimal:0}}));
const matchups=[...Array.from({length:5},(_,index)=>[{week:1,matchup_id:index+1,franchise_id:franchises[index].id,points:120-index},{week:1,matchup_id:index+1,franchise_id:franchises[9-index].id,points:100-index}]).flat(),...Array.from({length:5},(_,index)=>[{week:2,matchup_id:index+1,franchise_id:franchises[index].id,points:0},{week:2,matchup_id:index+1,franchise_id:franchises[9-index].id,points:0}]).flat()];
const dashboard=buildLeagueDashboard({synced_at:new Date().toISOString(),rosters,matchups,trades:[],transactions:[]},power,franchises);
assert.equal(dashboard.standings.length,10);
assert.equal(dashboard.completedWeek,1);
assert.equal(dashboard.currentWeek,2);
assert.equal(dashboard.matchups.length,10);
const odds=simulatePlayoffOdds(dashboard,1000);
assert.equal(odds.length,10);
assert.ok(Math.abs(odds.reduce((sum,team)=>sum+team.playoff,0)-600)<0.01,"Six playoff berths must be awarded in every simulation.");
assert.ok(Math.abs(odds.reduce((sum,team)=>sum+team.champion,0)-100)<0.01,"Every simulation must produce one champion.");
assert.ok(odds.every((team)=>team.playoff>=0&&team.playoff<=100&&team.champion>=0&&team.champion<=100));
console.log({live_teams:dashboard.standings.length,simulations:1000,playoff_slots:6});
