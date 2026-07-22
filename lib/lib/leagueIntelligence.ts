import type {LeagueDashboard,LiveStanding,PlayoffOdds} from "./liveLeague";
import type {Franchise,OKFLData} from "./types";

export type ClinchingScenario={
  franchiseId:string;franchise:string;rank:number;record:string;status:"Clinched"|"Bye clinched"|"In position"|"Chasing"|"Eliminated";
  playoffOdds:number;maxWins:number;winsNeeded:number;projectedCutoff:number;path:string;swingGames:string[];
};

export function buildClinchingScenarios(dashboard:LeagueDashboard,odds:PlayoffOdds[]):ClinchingScenario[]{
  const remaining=Math.max(0,14-dashboard.completedWeek);
  const oddsById=new Map(odds.map((row)=>[row.franchiseId,row]));
  const projectedCutoff=[...odds].sort((a,b)=>b.projectedWins-a.projectedWins)[5]?.projectedWins??0;
  return dashboard.standings.map((team,index)=>{
    const other=dashboard.standings.filter((row)=>row.franchiseId!==team.franchiseId);
    const maxWins=team.wins+remaining;
    const mathematicallyOut=other.filter((row)=>row.wins>maxWins).length>=6;
    const threatsAtFloor=other.filter((row)=>row.wins+remaining>=team.wins).length;
    const playoffClinched=dashboard.completedWeek>0&&threatsAtFloor<=5;
    const byeClinched=dashboard.completedWeek>0&&threatsAtFloor<=1;
    const oddsRow=oddsById.get(team.franchiseId);
    const winsNeeded=Math.max(0,Math.min(remaining,Math.ceil(projectedCutoff+.01-team.wins)));
    const status:ClinchingScenario["status"]=mathematicallyOut?"Eliminated":byeClinched?"Bye clinched":playoffClinched?"Clinched":index<6?"In position":"Chasing";
    const future=dashboard.matchups.filter((game)=>!game.complete&&(game.home.franchiseId===team.franchiseId||game.away.franchiseId===team.franchiseId)).slice(0,3);
    const swingGames=future.map((game)=>{const opponent=game.home.franchiseId===team.franchiseId?game.away:game.home;return `W${game.week} vs ${opponent.franchise}`;});
    const path=mathematicallyOut?`Can finish with at most ${maxWins} wins; six teams already own a higher floor.`:
      byeClinched?"A top-two seed is mathematically secured.":
      playoffClinched?"A top-six finish is mathematically secured.":
      remaining===0?`${index<6?"Finished inside":"Finished outside"} the six-team playoff field.`:
      winsNeeded===0?`Currently above the projected ${projectedCutoff.toFixed(1)}-win cut line; protect the points tiebreaker.`:
      `Target ${winsNeeded} more win${winsNeeded===1?"":"s"} to clear the projected ${projectedCutoff.toFixed(1)}-win cut line.`;
    return {franchiseId:team.franchiseId,franchise:team.franchise,rank:index+1,record:`${team.wins}-${team.losses}${team.ties?`-${team.ties}`:""}`,status,playoffOdds:oddsRow?.playoff??0,maxWins,winsNeeded,projectedCutoff,path,swingGames};
  }).sort((a,b)=>b.playoffOdds-a.playoffOdds||a.rank-b.rank);
}

export type LuckGame={season:number;week:number;franchiseId:string;franchise:string;score:number;opponentId:string;opponent:string;opponentScore:number;result:"W"|"L"|"T"};
export type LuckRow={franchiseId:string;franchise:string;actualWins:number;expectedWins:number;luckWins:number;allPlayWins:number;allPlayLosses:number;allPlayTies:number;pointsFor:number;pointsAgainst:number;scheduleRank:number;closeWins:number;closeLosses:number;weeks:number};

export function archiveLuckGames(data:OKFLData,season:number):LuckGame[]{
  return (data.weekly_games??[]).filter((row:any)=>Number(row.season)===season&&!row.playoff&&!row.consolation&&row.opponent_id).map((row:any)=>({
    season,week:Number(row.week),franchiseId:String(row.franchise_id),franchise:String(row.franchise),score:Number(row.score),opponentId:String(row.opponent_id),opponent:String(row.opponent),opponentScore:Number(row.opp_score),result:String(row.result)==="W"?"W":String(row.result)==="L"?"L":"T"
  }));
}

export function liveLuckGames(dashboard:LeagueDashboard):LuckGame[]{
  return dashboard.matchups.filter((game)=>game.complete).flatMap((game):LuckGame[]=>{
    const result=(left:number,right:number):"W"|"L"|"T"=>left>right?"W":left<right?"L":"T";
    return [
      {season:2026,week:game.week,franchiseId:game.home.franchiseId,franchise:game.home.franchise,score:game.homePoints,opponentId:game.away.franchiseId,opponent:game.away.franchise,opponentScore:game.awayPoints,result:result(game.homePoints,game.awayPoints)},
      {season:2026,week:game.week,franchiseId:game.away.franchiseId,franchise:game.away.franchise,score:game.awayPoints,opponentId:game.home.franchiseId,opponent:game.home.franchise,opponentScore:game.homePoints,result:result(game.awayPoints,game.homePoints)},
    ];
  });
}

export function buildLuckIndex(games:LuckGame[],franchises:Franchise[]):LuckRow[]{
  const byWeek=new Map<number,LuckGame[]>();
  games.forEach((game)=>byWeek.set(game.week,[...(byWeek.get(game.week)??[]),game]));
  const rows=new Map<string,Omit<LuckRow,"scheduleRank">>();
  for(const franchise of franchises)rows.set(franchise.id,{franchiseId:franchise.id,franchise:franchise.name,actualWins:0,expectedWins:0,luckWins:0,allPlayWins:0,allPlayLosses:0,allPlayTies:0,pointsFor:0,pointsAgainst:0,closeWins:0,closeLosses:0,weeks:0});
  for(const game of games){
    const row=rows.get(game.franchiseId);if(!row)continue;
    const field=byWeek.get(game.week)??[];const opponents=field.filter((other)=>other.franchiseId!==game.franchiseId);
    const allWins=opponents.filter((other)=>game.score>other.score).length,allLosses=opponents.filter((other)=>game.score<other.score).length,allTies=opponents.length-allWins-allLosses;
    const expected=opponents.length?(allWins+allTies*.5)/opponents.length:0;
    row.actualWins+=game.result==="W"?1:game.result==="T"?.5:0;row.expectedWins+=expected;row.allPlayWins+=allWins;row.allPlayLosses+=allLosses;row.allPlayTies+=allTies;row.pointsFor+=game.score;row.pointsAgainst+=game.opponentScore;row.weeks++;
    if(Math.abs(game.score-game.opponentScore)<=10){if(game.result==="W")row.closeWins++;if(game.result==="L")row.closeLosses++;}
  }
  const active=[...rows.values()].filter((row)=>row.weeks>0);const schedule=[...active].sort((a,b)=>(b.pointsAgainst/b.weeks)-(a.pointsAgainst/a.weeks));
  return active.map((row)=>({...row,luckWins:row.actualWins-row.expectedWins,scheduleRank:schedule.findIndex((entry)=>entry.franchiseId===row.franchiseId)+1})).sort((a,b)=>b.luckWins-a.luckWins||b.actualWins-a.actualWins);
}

export type OwnershipEvent={season:number;type:string;franchiseId:string;franchise:string;detail:string;date:string|null;direction:"acquired"|"departed"|"rostered"};
export type OwnershipPlayer={name:string;positions:string[];ownerCount:number;moveCount:number;seasons:number[];lastFranchise:string;championships:number;events:OwnershipEvent[];pfrUrl:string|null};

function playerKey(value:string){return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b/g,"").replace(/[^a-z0-9]/g,"");}
const EVENT_WEIGHTS:Record<string,number>={Draft:1,Keeper:2,Trade:3,"Free Agent":4,Waiver:4,Roster:5};
function eventWeight(type:string){return EVENT_WEIGHTS[type]??6;}

export function buildOwnershipIndex(data:OKFLData):OwnershipPlayer[]{
  return (data.players??[]).map((player:any):OwnershipPlayer=>{
    const events:OwnershipEvent[]=(player.events??[]).filter((event:any)=>event.franchise_id).map((event:any)=>{
      const detail=String(event.detail??"");const date=detail.match(/20\d{2}-\d{2}-\d{2}/)?.[0]??null;
      const direction:OwnershipEvent["direction"]=/\bdrop\b/i.test(detail)?"departed":event.type==="Roster"?"rostered":"acquired";
      return {season:Number(event.season),type:String(event.type),franchiseId:String(event.franchise_id),franchise:String(event.franchise),detail,date,direction};
    }).sort((a:OwnershipEvent,b:OwnershipEvent)=>a.season-b.season||(a.date??"").localeCompare(b.date??"")||eventWeight(a.type)-eventWeight(b.type));
    const owners=[...new Set(events.map((event)=>event.franchiseId))];const meaningful=events.filter((event)=>event.type!=="Roster");const last=[...events].reverse().find((event)=>event.direction!=="departed")??events.at(-1);
    return {name:String(player.name),positions:Array.isArray(player.positions)?player.positions.map(String):[],ownerCount:owners.length,moveCount:meaningful.length,seasons:[...new Set(events.map((event)=>event.season))],lastFranchise:last?.franchise??"Untracked",championships:Number(player.championships??0),events,pfrUrl:player.pfr_url?String(player.pfr_url):null};
  }).filter((player)=>player.events.length>0).sort((a,b)=>b.ownerCount-a.ownerCount||b.moveCount-a.moveCount||a.name.localeCompare(b.name));
}

export function findOwnershipPlayer(players:OwnershipPlayer[],query:string){
  const key=playerKey(query);if(!key)return players[0]??null;
  return players.find((player)=>playerKey(player.name)===key)??players.find((player)=>playerKey(player.name).includes(key))??null;
}

export type WaiverClaim={id:string;season:number;date:string;type:"Waiver"|"Free agent";franchiseId:string;franchise:string;player:string;position:string;points:number;starts:number;weeks:number;kept:boolean;champion:boolean;score:number};
export type WaiverManager={franchiseId:string;franchise:string;claims:number;points:number;starts:number;hits:number;keepers:number;titles:number;bestClaim:string;score:number};

export function buildWaiverHall(data:OKFLData){
  const players=new Map((data.players??[]).map((player:any)=>[playerKey(player.name),player]));const seen=new Set<string>();const claims:WaiverClaim[]=[];
  const adds=(data.transactions??[]).filter((row:any)=>(row.type==="waiver"||row.type==="free_agent")&&row.action==="add"&&row.player&&row.franchise_id).sort((a:any,b:any)=>String(a.date).localeCompare(String(b.date)));
  for(const tx of adds){
    const key=`${tx.season}-${tx.franchise_id}-${playerKey(tx.player)}`;if(seen.has(key))continue;seen.add(key);
    const player:any=players.get(playerKey(tx.player));const stat=(player?.season_stats??[]).find((row:any)=>Number(row.season)===Number(tx.season)&&row.franchise_id===tx.franchise_id);
    const kept=(data.keepers??[]).some((row:any)=>row.franchise_id===tx.franchise_id&&playerKey(row.player)===playerKey(tx.player)&&Number(row.season)>Number(tx.season));
    const champion=Boolean(stat)&&(data.championship_history??[]).some((row:any)=>Number(row.season)===Number(tx.season)&&row.franchise_id===tx.franchise_id);
    const points=Number(stat?.points??0),starts=Number(stat?.starts??0),weeks=Number(stat?.weeks??0),score=Math.max(0,points+starts*3+(kept?60:0)+(champion?100:0));
    claims.push({id:String(tx.transaction_id),season:Number(tx.season),date:String(tx.date??tx.season),type:tx.type==="waiver"?"Waiver":"Free agent",franchiseId:String(tx.franchise_id),franchise:String(tx.franchise),player:String(tx.player),position:String(tx.position??player?.positions?.[0]??""),points,starts,weeks,kept,champion,score});
  }
  claims.sort((a,b)=>b.score-a.score||b.points-a.points||a.date.localeCompare(b.date));
  const managers=new Map<string,WaiverManager>();
  for(const claim of claims){const row=managers.get(claim.franchiseId)??{franchiseId:claim.franchiseId,franchise:claim.franchise,claims:0,points:0,starts:0,hits:0,keepers:0,titles:0,bestClaim:"—",score:0};row.claims++;row.points+=claim.points;row.starts+=claim.starts;if(claim.points>=100)row.hits++;if(claim.kept)row.keepers++;if(claim.champion)row.titles++;row.score+=claim.score;if(row.bestClaim==="—")row.bestClaim=claim.player;managers.set(claim.franchiseId,row);}
  return {claims,managers:[...managers.values()].sort((a,b)=>b.score-a.score||b.points-a.points)};
}
