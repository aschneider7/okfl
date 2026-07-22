import type {AccountProfile} from "@/lib/accountIdentity";
import {buildAwardsRace} from "@/lib/leagueAwards";
import {buildLeagueDashboard,simulatePlayoffOdds} from "@/lib/liveLeague";
import type {LivePowerSnapshot} from "@/lib/livePowerRankings";
import {buildPowerRankings,type PowerRanking} from "@/lib/powerRankings";
import {draftPlayerKey} from "@/lib/draftRankings";
import {fallbackPprPool,projectedKeepers} from "@/lib/draftSimulator";
import type {OKFLData} from "@/lib/types";

type ProfileRow={team_display_name?:string|null;avatar_url?:string|null;primary_color?:string|null;accent_color?:string|null;bio?:string|null;motto?:string|null};

function playerName(player:any,id:string){return player?.full_name||[player?.first_name,player?.last_name].filter(Boolean).join(" ")||`Player ${id}`}
function badges(metric:any){
  const rows:Array<{key:string;icon:string;title:string;detail:string,tone:string}>=[];
  if(metric.championships>0)rows.push({key:"champion",icon:"★",title:metric.championships>1?"Multi-Time Champion":"League Champion",detail:`${metric.championships} OKFL title${metric.championships===1?"":"s"}`,tone:"gold"});
  if(metric.wins>=40)rows.push({key:"wins",icon:"W",title:"40-Win Club",detail:`${metric.wins} verified career wins`,tone:"green"});
  if(metric.win_pct>=55)rows.push({key:"winning",icon:"↑",title:"Winning Standard",detail:`${metric.win_pct.toFixed(1)}% career win rate`,tone:"blue"});
  if(metric.trade_count>=15)rows.push({key:"trader",icon:"↔",title:"Market Maker",detail:`${metric.trade_count} completed trades`,tone:"purple"});
  if(metric.keeper_count>=10)rows.push({key:"keeper",icon:"K",title:"Keeper Architect",detail:`${metric.keeper_count} keeper decisions`,tone:"lime"});
  if(metric.late_round_hits>=12)rows.push({key:"value",icon:"◇",title:"Value Miner",detail:`${metric.late_round_hits} late-round hits`,tone:"orange"});
  if(metric.runner_ups>0)rows.push({key:"finalist",icon:"Ⅱ",title:"Finals Proven",detail:`${metric.runner_ups} runner-up finish${metric.runner_ups===1?"":"es"}`,tone:"silver"});
  if(!rows.length)rows.push({key:"founder",icon:"26",title:"Founding Franchise",detail:"Building the next achievement",tone:"silver"});
  return rows.slice(0,6);
}

function rivalries(data:OKFLData,franchiseId:string){
  const games=(data.weekly_games||[]).filter((row:any)=>row.franchise_id===franchiseId&&row.opponent_id);
  const map=new Map<string,any>();
  for(const game of games){const row=map.get(game.opponent_id)||{franchiseId:game.opponent_id,franchise:game.opponent,wins:0,losses:0,ties:0,games:0,pointsFor:0,pointsAgainst:0,playoffGames:0,closest:999};row.games++;row.pointsFor+=Number(game.score||0);row.pointsAgainst+=Number(game.opp_score||0);row.closest=Math.min(row.closest,Math.abs(Number(game.margin||0)));if(game.result==="W")row.wins++;else if(game.result==="L")row.losses++;else row.ties++;if(game.playoff)row.playoffGames++;map.set(game.opponent_id,row)}
  return [...map.values()].map((row)=>({...row,intensity:row.games*8+row.playoffGames*12+Math.max(0,15-row.closest),pointsFor:Math.round(row.pointsFor*10)/10,pointsAgainst:Math.round(row.pointsAgainst*10)/10,closest:Math.round(row.closest*100)/100})).sort((a,b)=>b.intensity-a.intensity||b.games-a.games).slice(0,3);
}

export function buildMyFranchiseDashboard(input:{account:AccountProfile;data:OKFLData;snapshot:any;powerSnapshot:LivePowerSnapshot|null;directory:Record<string,any>;profile:ProfileRow|null;notifications:any[];activity:any[];keeperSubmission:any|null}){
  const {account,data,snapshot,directory}=input;
  const fallbackPower=buildPowerRankings(data);const power:PowerRanking[]=input.powerSnapshot?.rankings||fallbackPower;
  const dashboard=buildLeagueDashboard(snapshot,power,data.franchises);const standing=dashboard.standings.find((row)=>row.franchiseId===account.franchiseId)||null;
  const odds=simulatePlayoffOdds(dashboard,2500).find((row)=>row.franchiseId===account.franchiseId)||null;
  const ranking=power.find((row)=>row.franchiseId===account.franchiseId)||null;
  const upcoming=dashboard.matchups.find((game)=>!game.complete&&game.week>=dashboard.currentWeek&&(game.home.franchiseId===account.franchiseId||game.away.franchiseId===account.franchiseId))||null;
  const matchup=upcoming?{week:upcoming.week,opponent:upcoming.home.franchiseId===account.franchiseId?upcoming.away:upcoming.home,myTeam:upcoming.home.franchiseId===account.franchiseId?upcoming.home:upcoming.away}:null;
  const roster=(snapshot?.rosters||[]).find((row:any)=>row.franchise_id===account.franchiseId);const starters=new Set((roster?.starters||[]).map(String));
  const latestRow=(snapshot?.matchups||[]).filter((row:any)=>row.franchise_id===account.franchiseId&&Number(row.points)>0).sort((a:any,b:any)=>Number(b.week)-Number(a.week))[0];
  const rosterPlayers=(roster?.players||[]).map(String).map((id:string)=>{const player=directory[id]||{};return{id,name:playerName(player,id),position:String(player.position||"FLEX"),team:String(player.team||"FA"),starter:starters.has(id),latestPoints:Number(latestRow?.players_points?.[id]||0)}}).sort((a:any,b:any)=>Number(b.starter)-Number(a.starter)||b.latestPoints-a.latestPoints||a.position.localeCompare(b.position));
  const awards=snapshot?buildAwardsRace(snapshot,directory,power,dashboard):null;
  const awardRows=[...(awards?.managerRaces||[]).map((race)=>{const candidate=race.candidates.find((row)=>row.franchiseId===account.franchiseId);return candidate?{key:race.key,title:race.title,rank:candidate.rank,score:candidate.score,detail:candidate.reason}:null}),...(awards?.playerRaces||[]).flatMap((race)=>race.candidates.filter((row)=>row.franchiseId===account.franchiseId).slice(0,2).map((candidate)=>({key:`${race.key}-${candidate.playerId}`,title:race.title,rank:candidate.rank,score:candidate.score,detail:`${candidate.name} · ${candidate.points.toFixed(1)} points`})))].filter(Boolean);
  const savedKeepers=Array.isArray(input.keeperSubmission?.choices)?input.keeperSubmission.choices:[];
  const keeperRecommendations=(savedKeepers.length?savedKeepers:projectedKeepers.filter((row)=>row.franchiseId===account.franchiseId).map((row)=>({player:row.player,position:row.position,round:row.round}))).map((row:any)=>({...row,value:Math.max(1,18-Number(row.round||17)),status:savedKeepers.length?input.keeperSubmission.status:"recommended"}));
  const targetCounts:Record<string,number>={QB:2,RB:4,WR:5,TE:2};const positionCounts=rosterPlayers.reduce((map:any,row:any)=>({...map,[row.position]:(map[row.position]||0)+1}),{});const needs=Object.entries(targetCounts).map(([position,target])=>({position,count:positionCounts[position]||0,target,gap:Math.max(0,target-(positionCounts[position]||0))})).sort((a,b)=>b.gap-a.gap||a.count-b.count);
  const rankMap=new Map(fallbackPprPool().map((player)=>[draftPlayerKey(player.name),player.pprRank]));const neededPositions=new Set(needs.filter((row)=>row.gap>0).map((row)=>row.position));
  const otherRosterIds=new Map<string,string>();for(const other of snapshot?.rosters||[])if(other.franchise_id&&other.franchise_id!==account.franchiseId)for(const id of other.players||[])otherRosterIds.set(String(id),other.franchise_id);
  const targets=[...otherRosterIds.entries()].map(([id,franchiseId])=>{const player=directory[id]||{};return{id,name:playerName(player,id),position:String(player.position||""),team:String(player.team||"FA"),franchiseId,franchise:data.franchises.find((row)=>row.id===franchiseId)?.name||franchiseId,rank:rankMap.get(draftPlayerKey(playerName(player,id)))||999}}).filter((row)=>neededPositions.has(row.position)).sort((a,b)=>a.rank-b.rank).slice(0,6);
  const metric:any=(data.franchise_metrics||[]).find((row:any)=>row.franchise_id===account.franchiseId)||{};const finishes=(metric.season_finishes||[]).sort((a:any,b:any)=>a.season-b.season);
  const archiveActivity=(data.transactions||[]).filter((row:any)=>row.franchise_id===account.franchiseId).sort((a:any,b:any)=>String(b.date||"").localeCompare(String(a.date||""))).slice(0,6).map((row:any)=>({id:`archive-${row.transaction_id}-${row.action}`,type:row.type,title:`${String(row.action||"Move").replace(/^./,(value:string)=>value.toUpperCase())}: ${row.player||"Roster move"}`,detail:`${row.position||"Player"} · ${row.source||"League"}`,createdAt:row.date||String(row.season)}));
  const activity=[...(input.activity||[]).map((row:any)=>({id:row.id,type:row.event_type,title:row.title,detail:row.detail,createdAt:row.created_at})),...archiveActivity].slice(0,10);
  const notifications=(input.notifications||[]).map((row:any)=>({id:row.id,kind:row.kind,title:row.title,body:row.body,href:row.href,read:Boolean(row.read_at),createdAt:row.created_at}));
  const profile={teamDisplayName:input.profile?.team_display_name||account.franchiseName,avatarUrl:input.profile?.avatar_url||"",primaryColor:input.profile?.primary_color||"#171915",accentColor:input.profile?.accent_color||"#c8ff38",bio:input.profile?.bio||"",motto:input.profile?.motto||""};
  return {generatedAt:new Date().toISOString(),profile,identity:{...account},season:{available:dashboard.available,currentWeek:dashboard.currentWeek,completedWeek:dashboard.completedWeek,standing,matchup,odds,power:ranking},roster:rosterPlayers,keepers:{status:input.keeperSubmission?.status||"not submitted",submittedAt:input.keeperSubmission?.submitted_at||null,recommendations:keeperRecommendations},trade:{needs,targets},awards:{throughWeek:awards?.throughWeek||0,rows:awardRows},career:{metric,finishes,badges:badges(metric),rivalries:rivalries(data,account.franchiseId)},inbox:{unread:notifications.filter((row)=>!row.read).length,counts:{offers:notifications.filter((row)=>row.kind==="offer"&&!row.read).length,polls:notifications.filter((row)=>row.kind==="poll"&&!row.read).length,notifications:notifications.filter((row)=>row.kind==="notification"&&!row.read).length},items:notifications},activity};
}
