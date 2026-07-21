import type {Franchise} from "./types";
import type {PowerRanking} from "./powerRankings";

export type LiveStanding={franchiseId:string;franchise:string;manager:string;wins:number;losses:number;ties:number;points:number;power:number;powerRank:number;streak:string};
export type LiveMatchup={week:number;matchupId:string;home:LiveStanding;away:LiveStanding;homePoints:number;awayPoints:number;complete:boolean};
export type LeagueDashboard={available:boolean;syncedAt:string|null;currentWeek:number;completedWeek:number;standings:LiveStanding[];matchups:LiveMatchup[];awards:Array<{label:string;value:string;detail:string}>;activity:Array<{type:string;title:string;detail:string;time:number}>};
export type PlayoffOdds={franchiseId:string;franchise:string;playoff:number;bye:number;first:number;champion:number;projectedWins:number};

function rosterPoints(settings:any){return Number(settings?.fpts??0)+Number(settings?.fpts_decimal??0)/100;}
function officialGamesPlayed(rosters:any[]){
  return Math.max(0,...rosters.map((roster)=>{const settings=roster.settings??{};return Number(settings.wins??0)+Number(settings.losses??0)+Number(settings.ties??0);}));
}
function completedWeekFromSnapshot(snapshot:any,rows:any[]){
  const officialGames=officialGamesPlayed(snapshot.rosters??[]);
  if(officialGames>0)return Math.min(14,officialGames);
  const stateWeek=Number(snapshot.nfl_state?.week);
  if(Number.isFinite(stateWeek)&&stateWeek>0)return Math.min(14,Math.max(0,stateWeek-1));
  const weeks=[...new Set(rows.map((row:any)=>Number(row.week)).filter((week:number)=>week>0&&week<=14))];
  return Math.max(0,...weeks.filter((week)=>{
    const weekRows=rows.filter((row:any)=>Number(row.week)===week&&row.franchise_id);
    return weekRows.length>0&&weekRows.every((row:any)=>Number(row.points)>0);
  }));
}
function teamRecordFromGames(id:string,rows:any[]){
  let wins=0,losses=0,ties=0;
  const games=rows.filter((row)=>row.franchise_id===id&&Number(row.points)>0);
  for(const game of games){
    const opponent=rows.find((row)=>Number(row.week)===Number(game.week)&&row.matchup_id===game.matchup_id&&row.franchise_id!==id&&Number(row.points)>0);
    if(!opponent)continue;
    if(Number(game.points)>Number(opponent.points))wins++; else if(Number(game.points)<Number(opponent.points))losses++; else ties++;
  }
  return {wins,losses,ties};
}
function streakFor(id:string,rows:any[]){
  const games=rows.filter((row)=>row.franchise_id===id&&Number(row.points)>0).sort((a,b)=>Number(b.week)-Number(a.week));
  const results=games.map((game)=>{const opponent=rows.find((row)=>Number(row.week)===Number(game.week)&&row.matchup_id===game.matchup_id&&row.franchise_id!==id&&Number(row.points)>0);return !opponent?"":Number(game.points)>Number(opponent.points)?"W":Number(game.points)<Number(opponent.points)?"L":"T";}).filter(Boolean);
  if(!results.length)return "—"; const first=results[0]; let count=0; for(const result of results){if(result!==first)break;count++;} return `${first}${count}`;
}

export function buildLeagueDashboard(snapshot:any,power:PowerRanking[],franchises:Franchise[]):LeagueDashboard{
  if(!snapshot||snapshot.available===false)return {available:false,syncedAt:null,currentWeek:1,completedWeek:0,standings:[],matchups:[],awards:[],activity:[]};
  const rows=snapshot.matchups??[]; const powerById=new Map(power.map((team)=>[team.franchiseId,team]));
  const completedWeek=completedWeekFromSnapshot(snapshot,rows);
  const scheduledWeeks=rows.filter((row:any)=>Number(row.week)>completedWeek).map((row:any)=>Number(row.week));
  const currentWeek=Math.min(14,Math.max(1,scheduledWeeks.length?Math.min(...scheduledWeeks):completedWeek+1));
  const standings:LiveStanding[]=(snapshot.rosters??[]).filter((roster:any)=>roster.franchise_id).map((roster:any):LiveStanding=>{
    const franchise=franchises.find((item)=>item.id===roster.franchise_id); const calculated=teamRecordFromGames(roster.franchise_id,rows); const settings=roster.settings??{};
    const hasOfficial=Number(settings.wins??0)+Number(settings.losses??0)+Number(settings.ties??0)>0;
    const ranking=powerById.get(roster.franchise_id);
    return {franchiseId:roster.franchise_id,franchise:franchise?.name??roster.franchise??roster.franchise_id,manager:franchise?.current_manager??"—",wins:hasOfficial?Number(settings.wins??0):calculated.wins,losses:hasOfficial?Number(settings.losses??0):calculated.losses,ties:hasOfficial?Number(settings.ties??0):calculated.ties,points:rosterPoints(settings)||rows.filter((row:any)=>row.franchise_id===roster.franchise_id).reduce((sum:number,row:any)=>sum+Number(row.points??0),0),power:ranking?.score??50,powerRank:ranking?.rank??10,streak:streakFor(roster.franchise_id,rows)};
  });
  standings.sort((a,b)=>b.wins-a.wins||b.ties-a.ties||b.points-a.points||a.powerRank-b.powerRank);
  const byId=new Map(standings.map((team)=>[team.franchiseId,team]));
  const grouped=new Map<string,any[]>();
  for(const row of rows){if(!row.franchise_id||row.matchup_id==null)continue;const key=`${row.week}-${row.matchup_id}`;grouped.set(key,[...(grouped.get(key)??[]),row]);}
  const matchups=[...grouped.entries()].filter(([,pair])=>pair.length===2).map(([key,pair]):LiveMatchup=>({week:Number(pair[0].week),matchupId:key,home:byId.get(pair[0].franchise_id)!,away:byId.get(pair[1].franchise_id)!,homePoints:Number(pair[0].points??0),awayPoints:Number(pair[1].points??0),complete:Number(pair[0].week)<=completedWeek})).filter((game)=>game.home&&game.away).sort((a,b)=>a.week-b.week||a.matchupId.localeCompare(b.matchupId));
  const completed=matchups.filter((game)=>game.complete); const latest=completed.filter((game)=>game.week===completedWeek);
  const topGame=[...latest].sort((a,b)=>Math.max(b.homePoints,b.awayPoints)-Math.max(a.homePoints,a.awayPoints))[0];
  const closeGame=[...latest].sort((a,b)=>Math.abs(a.homePoints-a.awayPoints)-Math.abs(b.homePoints-b.awayPoints))[0];
  const leader=standings[0]; const hot=[...standings].filter((team)=>team.streak.startsWith("W")).sort((a,b)=>Number(b.streak.slice(1))-Number(a.streak.slice(1)))[0];
  const awards=[
    {label:"League leader",value:leader?.franchise??"Preseason",detail:leader?`${leader.wins}-${leader.losses} · ${leader.points.toFixed(1)} PF`:"Waiting for the first sync"},
    {label:"Weekly high",value:topGame?(topGame.homePoints>topGame.awayPoints?topGame.home.franchise:topGame.away.franchise):"Not played",detail:topGame?`${Math.max(topGame.homePoints,topGame.awayPoints).toFixed(1)} points in Week ${completedWeek}`:"Appears after Week 1"},
    {label:"Closest finish",value:closeGame?`${closeGame.home.franchise} vs ${closeGame.away.franchise}`:"Not played",detail:closeGame?`${Math.abs(closeGame.homePoints-closeGame.awayPoints).toFixed(2)}-point margin`:"Appears after Week 1"},
    {label:"Hottest team",value:hot?.franchise??"No streak yet",detail:hot?`${hot.streak} current streak`:"The race starts in Week 1"}
  ];
  const activity=[...(snapshot.trades??[]).map((trade:any)=>({type:"Trade",title:(trade.sides??[]).map((side:any)=>side.franchise).filter(Boolean).join(" ↔ ")||"Completed trade",detail:`Week ${trade.week??"—"} · ${(trade.sides??[]).reduce((sum:number,side:any)=>sum+(side.players_received?.length??0),0)} players moved`,time:Number(trade.created_at_ms??trade.created??0)})),...(snapshot.transactions??[]).filter((tx:any)=>tx.type!=="trade"&&tx.status==="complete").map((tx:any)=>({type:tx.type==="waiver"?"Waiver":"Move",title:`${tx.type==="waiver"?"Waiver claim":"Roster move"}`,detail:`${(tx.adds??[]).length} added · ${(tx.drops??[]).length} dropped`,time:Number(tx.created_at_ms??tx.created??0)}))].sort((a,b)=>b.time-a.time).slice(0,6);
  return {available:true,syncedAt:snapshot.synced_at??null,currentWeek,completedWeek,standings,matchups,awards,activity};
}

function rng(seed:number){let value=seed>>>0;return()=>{value=(value*1664525+1013904223)>>>0;return value/4294967296;};}
function normal(random:()=>number){return Math.sqrt(-2*Math.log(Math.max(random(),1e-9)))*Math.cos(2*Math.PI*random());}
function winChance(a:LiveStanding,b:LiveStanding,boostId:string,boost:number,completedWeek:number){
  const adjustedA=a.power+(a.franchiseId===boostId?boost:0),adjustedB=b.power+(b.franchiseId===boostId?boost:0);
  const confidence=completedWeek===0?.58:Math.min(.82,.66+completedWeek*.012);
  const scale=completedWeek===0?80:Math.max(28,52-completedWeek*1.5);
  const raw=1/(1+Math.exp(-(adjustedA-adjustedB)/scale));
  return Math.max(1-confidence,Math.min(confidence,raw));
}
function generatedSchedule(teams:LiveStanding[],startWeek:number){
  const ids=teams.map((team)=>team.franchiseId); const games:Array<[number,string,string]>=[]; if(ids.length<2)return games;
  let rotation=[...ids]; for(let week=startWeek;week<=14;week++){for(let index=0;index<rotation.length/2;index++)games.push([week,rotation[index],rotation[rotation.length-1-index]]);rotation=[rotation[0],rotation[rotation.length-1],...rotation.slice(1,-1)];} return games;
}
function remainingSchedule(dashboard:LeagueDashboard){
  const teams=dashboard.standings,startWeek=Math.max(1,dashboard.completedWeek+1);
  const fallback=generatedSchedule(teams,startWeek),known=dashboard.matchups.filter((game)=>!game.complete&&game.week>=startWeek&&game.week<=14);
  const schedule:Array<[number,string,string]>=[];
  for(let week=startWeek;week<=14;week++){
    const used=new Set<string>(),seen=new Set<string>();
    const add=(aId:string,bId:string)=>{const key=[aId,bId].sort().join(":");if(!aId||!bId||aId===bId||used.has(aId)||used.has(bId)||seen.has(key))return false;used.add(aId);used.add(bId);seen.add(key);schedule.push([week,aId,bId]);return true;};
    known.filter((game)=>game.week===week).forEach((game)=>add(game.home.franchiseId,game.away.franchiseId));
    fallback.filter(([gameWeek])=>gameWeek===week).forEach(([,aId,bId])=>add(aId,bId));
    const remaining=teams.map((team)=>team.franchiseId).filter((id)=>!used.has(id));
    for(let index=0;index+1<remaining.length;index+=2)add(remaining[index],remaining[index+1]);
  }
  return schedule;
}
export function simulatePlayoffOdds(dashboard:LeagueDashboard,iterations=5000,boostId="",boost=0):PlayoffOdds[]{
  const teams=dashboard.standings; if(!teams.length)return [];
  const schedule=remainingSchedule(dashboard); const byId=new Map(teams.map((team)=>[team.franchiseId,team]));
  const totals=new Map(teams.map((team)=>[team.franchiseId,{playoff:0,bye:0,first:0,champion:0,wins:0}])); const random=rng(26072026+iterations+boost*17);
  for(let run=0;run<iterations;run++){
    const table=new Map(teams.map((team)=>[team.franchiseId,{wins:team.wins+team.ties*.5,points:team.points}]));
    for(const [,aId,bId] of schedule){const a=byId.get(aId),b=byId.get(bId);if(!a||!b)continue;const aRow=table.get(aId)!,bRow=table.get(bId)!;if(random()<winChance(a,b,boostId,boost,dashboard.completedWeek))aRow.wins++;else bRow.wins++;aRow.points+=Math.max(60,118+(a.power-50)*.3+normal(random)*18);bRow.points+=Math.max(60,118+(b.power-50)*.3+normal(random)*18);}
    const seeded=[...teams].sort((a,b)=>{const ar=table.get(a.franchiseId)!,br=table.get(b.franchiseId)!;return br.wins-ar.wins||br.points-ar.points;});
    seeded.forEach((team,index)=>{const total=totals.get(team.franchiseId)!;total.wins+=table.get(team.franchiseId)!.wins;if(index<6)total.playoff++;if(index<2)total.bye++;if(index===0)total.first++;});
    const play=(a:LiveStanding,b:LiveStanding)=>random()<winChance(a,b,boostId,boost,dashboard.completedWeek)?a:b;
    const wild=[play(seeded[2],seeded[5]),play(seeded[3],seeded[4])].sort((a,b)=>seeded.indexOf(a)-seeded.indexOf(b));
    const semiA=play(seeded[0],wild[1]),semiB=play(seeded[1],wild[0]); totals.get(play(semiA,semiB).franchiseId)!.champion++;
  }
  return teams.map((team)=>{const total=totals.get(team.franchiseId)!;return {franchiseId:team.franchiseId,franchise:team.franchise,playoff:total.playoff/iterations*100,bye:total.bye/iterations*100,first:total.first/iterations*100,champion:total.champion/iterations*100,projectedWins:total.wins/iterations};}).sort((a,b)=>b.playoff-a.playoff||b.champion-a.champion);
}
