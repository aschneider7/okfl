import type {OKFLData} from "./types";
import {buildPowerRankings, type PowerDimension, type PowerRanking} from "./powerRankings";
import {draftPlayerKey} from "./draftRankings";
import {fallbackPprPool} from "./draftSimulator";

export type LivePowerPhase="preseason"|"post_draft"|"regular"|"playoffs";
export type LivePowerSnapshot={
  season:number;
  week:number;
  phase:LivePowerPhase;
  modelVersion:string;
  modelLabel:string;
  syncedAt:string;
  weights:Array<{label:string;value:number}>;
  rankings:PowerRanking[];
};

function average(values:number[],fallback=0){return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:fallback;}
function percentile(values:number[],value:number){
  const sorted=[...values].sort((a,b)=>a-b); if(!sorted.length)return 50;
  const below=sorted.filter((row)=>row<value).length; const equal=sorted.filter((row)=>row===value).length;
  return Math.round(((below+equal*.5)/sorted.length)*100);
}
function tier(rank:number){return rank<=2?"Title favorite":rank<=5?"Contender":rank<=7?"Playoff hunt":"Needs a surge";}

export function buildLivePowerSnapshot(data:OKFLData,sleeper:any,previous?:LivePowerSnapshot|null):LivePowerSnapshot{
  const baseline=buildPowerRankings(data);
  const matchups=(sleeper?.matchups??[]).filter((row:any)=>row.franchise_id&&Number(row.points)>0);
  const latestWeek=Math.max(0,...matchups.map((row:any)=>Number(row.week)||0));
  const draftPicks=(sleeper?.drafts??[]).flatMap((draft:any)=>draft.picks??draft.raw?.picks??[]).filter((pick:any)=>pick.franchise_id);
  const hasDraft=draftPicks.length>0;
  const phase:LivePowerPhase=latestWeek>=15?"playoffs":latestWeek>0?"regular":hasDraft?"post_draft":"preseason";
  const syncedAt=String(sleeper?.synced_at??new Date().toISOString());

  if(phase==="preseason") return {
    season:2026,week:0,phase,modelVersion:"live-1",modelLabel:"Preseason edition",syncedAt,
    weights:[{label:"Recent scoring",value:30},{label:"Recent wins",value:20},{label:"Final finishes",value:15},{label:"Weekly force",value:15},{label:"Development",value:10},{label:"Resume",value:10}],
    rankings:baseline
  };

  const playerRanks=new Map(fallbackPprPool().map((player)=>[draftPlayerKey(player.name),player.pprRank]));
  const raw=baseline.map((base)=>{
    const teamGames=matchups.filter((row:any)=>row.franchise_id===base.franchiseId&&Number(row.week)<=latestWeek);
    let wins=0,losses=0,ties=0;
    for(const game of teamGames){
      const opponent=matchups.find((row:any)=>Number(row.week)===Number(game.week)&&row.matchup_id!=null&&row.matchup_id===game.matchup_id&&row.franchise_id!==game.franchise_id);
      if(!opponent)continue;
      if(Number(game.points)>Number(opponent.points))wins++; else if(Number(game.points)<Number(opponent.points))losses++; else ties++;
    }
    const recent=teamGames.filter((row:any)=>Number(row.week)>latestWeek-3);
    const picks=draftPicks.filter((pick:any)=>pick.franchise_id===base.franchiseId);
    const ranked:Array<{rank:number;overall:number}>=picks.map((pick:any)=>{
      const name=pick.metadata?.first_name&&pick.metadata?.last_name?`${pick.metadata.first_name} ${pick.metadata.last_name}`:pick.metadata?.player_name??pick.player_name??"";
      return {rank:playerRanks.get(draftPlayerKey(name))??170,overall:Number(pick.pick_no??170)};
    });
    const rosterValue=ranked.reduce((sum,pick)=>sum+Math.max(1,181-pick.rank),0);
    const draftValue=average(ranked.map((pick)=>pick.overall-pick.rank));
    return {base,teamGames,wins,losses,ties,points:average(teamGames.map((row:any)=>Number(row.points))),recentPoints:average(recent.map((row:any)=>Number(row.points))),rosterValue,draftValue};
  });

  const list=(key:"points"|"recentPoints"|"rosterValue"|"draftValue")=>raw.map((row)=>row[key]);
  const winRates=raw.map((row)=>{
    const games=row.wins+row.losses+row.ties;
    return games?(row.wins+row.ties*.5)/games:0;
  });
  const provisional=raw.map((row,index)=>{
    const dimensions:PowerDimension[]=phase==="post_draft"?[
      {key:"roster",label:"Drafted roster",score:percentile(list("rosterValue"),row.rosterValue),weight:45,detail:"Current roster strength based on the synced Sleeper draft board and OKFL player values"},
      {key:"value",label:"Draft value",score:percentile(list("draftValue"),row.draftValue),weight:20,detail:"Value gained relative to where each player was selected"},
      {key:"baseline",label:"Preseason foundation",score:row.base.score,weight:25,detail:"Recent OKFL scoring, wins, finishes, and roster-development history"},
      {key:"development",label:"Roster development",score:row.base.dimensions.find((item)=>item.key==="development")?.score??50,weight:10,detail:"Keeper and late-round development history"},
    ]:[
      {key:"scoring",label:"2026 scoring",score:percentile(list("points"),row.points),weight:30,detail:`${row.points.toFixed(1)} points per completed 2026 matchup`},
      {key:"wins",label:"2026 win rate",score:percentile(winRates,winRates[index]),weight:25,detail:`${row.wins}-${row.losses}${row.ties?`-${row.ties}`:""} through Week ${latestWeek}`},
      {key:"form",label:"Last three weeks",score:percentile(list("recentPoints"),row.recentPoints),weight:20,detail:`${row.recentPoints.toFixed(1)} average points over the latest three weeks`},
      {key:"roster",label:"Drafted roster",score:percentile(list("rosterValue"),row.rosterValue),weight:15,detail:"Synced Sleeper draft-board roster strength"},
      {key:"baseline",label:"Preseason foundation",score:row.base.score,weight:10,detail:"Preseason model retained as a stabilizing prior"},
    ];
    return {row,dimensions,score:Math.round(dimensions.reduce((sum,item)=>sum+item.score*item.weight/100,0))};
  }).sort((a,b)=>b.score-a.score||b.row.points-a.row.points||a.row.base.rank-b.row.base.rank);

  const prior=new Map((previous?.rankings??baseline).map((team)=>[team.franchiseId,team.rank]));
  const rankings=provisional.map(({row,dimensions,score},index):PowerRanking=>{
    const rank=index+1,previousRank=prior.get(row.base.franchiseId)??row.base.rank;
    const strength=[...dimensions].sort((a,b)=>b.score-a.score)[0],concern=[...dimensions].sort((a,b)=>a.score-b.score)[0];
    const record=latestWeek?`${row.wins}-${row.losses}${row.ties?`-${row.ties}`:""}`:"Post-draft";
    return {...row.base,rank,score,tier:tier(rank),movement:previousRank-rank,previousRank,record,dimensions,strength,concern,
      summary:`${row.base.franchise} is powered by ${strength.label.toLowerCase()}; ${concern.label.toLowerCase()} is the clearest path to the next tier.`};
  });
  return {season:2026,week:latestWeek,phase,modelVersion:"live-1",modelLabel:phase==="post_draft"?"Post-draft edition":phase==="playoffs"?`Playoffs · Week ${latestWeek}`:`Week ${latestWeek} edition`,syncedAt,
    weights:(rankings[0]?.dimensions??[]).map((item)=>({label:item.label,value:item.weight})),rankings};
}
