import type {OKFLData} from "./types";

export type PowerDimension={key:string;label:string;score:number;weight:number;detail:string};
export type PowerRanking={rank:number;franchiseId:string;franchise:string;manager:string;score:number;tier:string;movement:number;previousRank:number;record:string;dimensions:PowerDimension[];strength:PowerDimension;concern:PowerDimension;summary:string};

function percentile(values:number[],value:number,inverse=false){
  const sorted=[...values].sort((a,b)=>a-b); if(!sorted.length)return 50;
  const below=sorted.filter((row)=>row<value).length; const equal=sorted.filter((row)=>row===value).length;
  const result=((below+equal*.5)/sorted.length)*100;
  return Math.round(inverse?100-result:result);
}

function average(values:number[],fallback=0){return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:fallback;}

export function buildPowerRankings(data:OKFLData):PowerRanking[]{
  const seasons=[2024,2025];
  const recent=data.regular_standings.filter((row:any)=>seasons.includes(Number(row.season)));
  const latest=data.regular_standings.filter((row:any)=>Number(row.season)===2025);
  const franchiseRows=data.franchises.map((franchise)=>{
    const metric=data.franchise_metrics.find((row)=>row.franchise_id===franchise.id)!;
    const standings=recent.filter((row:any)=>row.franchise_id===franchise.id);
    const finishes=(metric.season_finishes||[]).filter((row:any)=>seasons.includes(Number(row.season)));
    return {franchise,metric,standings,
      recentPoints:average(standings.map((row:any)=>Number(row.points||0))),
      recentWins:average(standings.map((row:any)=>Number(row.win_pct||0))),
      recentFinish:average(finishes.map((row:any)=>Number(row.finish||10)),Number(metric.average_finish)),
      development:(Number(metric.keeper_count||0)+Number(metric.late_round_hits||0)*1.35),
    };
  });
  const values=(key:"recentPoints"|"recentWins"|"recentFinish"|"development")=>franchiseRows.map((row)=>row[key]);
  const metricValues=(key:"avg_score"|"legacy_score")=>franchiseRows.map((row)=>Number(row.metric[key]||0));
  const provisional=franchiseRows.map((row)=>{
    const dimensions:PowerDimension[]=[
      {key:"form",label:"Recent scoring",score:percentile(values("recentPoints"),row.recentPoints),weight:30,detail:`${row.recentPoints.toFixed(1)} average points across the 2024–25 regular seasons`},
      {key:"wins",label:"Recent win rate",score:percentile(values("recentWins"),row.recentWins),weight:20,detail:`${row.recentWins.toFixed(1)}% average regular-season win rate in 2024–25`},
      {key:"finish",label:"Final finishes",score:percentile(values("recentFinish"),row.recentFinish,true),weight:15,detail:`${row.recentFinish.toFixed(1)} average final finish over the last two seasons`},
      {key:"ceiling",label:"Weekly scoring force",score:percentile(metricValues("avg_score"),Number(row.metric.avg_score||0)),weight:15,detail:`${Number(row.metric.avg_score||0).toFixed(1)} points per tracked team-week`},
      {key:"development",label:"Roster development",score:percentile(values("development"),row.development),weight:10,detail:`${row.metric.keeper_count} keeper events and ${row.metric.late_round_hits} late-round hits`},
      {key:"legacy",label:"Proven résumé",score:percentile(metricValues("legacy_score"),Number(row.metric.legacy_score||0)),weight:10,detail:`${row.metric.championships} titles and a ${row.metric.legacy_score} legacy score`},
    ];
    const score=Math.round(dimensions.reduce((sum,dimension)=>sum+dimension.score*dimension.weight/100,0));
    return {row,dimensions,score};
  }).sort((a,b)=>b.score-a.score||Number(b.row.metric.avg_score)-Number(a.row.metric.avg_score));

  return provisional.map(({row,dimensions,score},index)=>{
    const rank=index+1; const previous=latest.find((standing:any)=>standing.franchise_id===row.franchise.id);
    const previousRank=Number(previous?.rank||rank); const strength=dimensions.slice().sort((a,b)=>b.score-a.score)[0]; const concern=dimensions.slice().sort((a,b)=>a.score-b.score)[0];
    const tier=rank<=2?"Title favorite":rank<=5?"Contender":rank<=7?"Playoff hunt":"Needs a surge";
    return {rank,franchiseId:row.franchise.id,franchise:row.franchise.name,manager:row.franchise.current_manager,score,tier,movement:previousRank-rank,previousRank,record:String(previous?.record||"—"),dimensions,strength,concern,
      summary:`${row.franchise.name} rises on ${strength.label.toLowerCase()}; ${concern.label.toLowerCase()} is the clearest obstacle to the next tier.`};
  });
}
