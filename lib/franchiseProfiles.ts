
type AnyData = any;

export type ProfileTag = {
  label: string;
  icon: string;
  detail: string;
  tone: "blue" | "gold" | "green" | "purple" | "red" | "slate";
  score: number;
};

export type DnaDimension = {
  label: string;
  value: number;
  detail: string;
};

function percentile(values:number[], value:number, inverse=false) {
  if (!values.length) return 50;
  const sorted=[...values].sort((a,b)=>a-b);
  const below=sorted.filter((item)=>item<value).length;
  const equal=sorted.filter((item)=>item===value).length;
  let result=((below+equal*.5)/sorted.length)*100;
  if(inverse) result=100-result;
  return Math.max(4,Math.min(98,Math.round(result)));
}

function std(values:number[]) {
  if(values.length<2)return 0;
  const mean=values.reduce((sum,value)=>sum+value,0)/values.length;
  return Math.sqrt(values.reduce((sum,value)=>sum+(value-mean)**2,0)/values.length);
}

function rank(data:AnyData, field:string, value:number, inverse=false) {
  const values=data.franchise_metrics.map((row:any)=>Number(row[field]??0));
  return percentile(values,value,inverse);
}

function positionShare(metric:any, position:string) {
  const counts=metric.draft_positions??{};
  const total=Object.values(counts).reduce((sum:number,value:any)=>sum+Number(value||0),0);
  return total?Number(counts[position]||0)/total:0;
}

export function buildFranchiseProfile(data:AnyData, franchiseId:string) {
  const metric=data.franchise_metrics.find((row:any)=>row.franchise_id===franchiseId);
  const franchise=data.franchises.find((row:any)=>row.id===franchiseId);
  if(!metric||!franchise)return null;

  const games=data.weekly_games.filter((game:any)=>game.franchise_id===franchiseId);
  const margins=games.map((game:any)=>Number(game.margin??(Number(game.score)-Number(game.opp_score))));
  const finishes=(metric.season_finishes??[]).map((row:any)=>Number(row.finish));
  const scoreVariance=std(games.map((game:any)=>Number(game.score||0)));
  const finishVariance=std(finishes);

  const tradeRank=rank(data,"trade_count",Number(metric.trade_count));
  const keeperRank=rank(data,"keeper_count",Number(metric.keeper_count));
  const lateRank=rank(data,"late_round_hits",Number(metric.late_round_hits));
  const winRank=rank(data,"win_pct",Number(metric.win_pct));
  const scoringRank=rank(data,"avg_score",Number(metric.avg_score));
  const finishRank=rank(data,"average_finish",Number(metric.average_finish),true);
  const legacyRank=rank(data,"legacy_score",Number(metric.legacy_score));
  const pressureRank=percentile(
    data.franchise_metrics.map((row:any)=>{
      const rows=data.weekly_games.filter((game:any)=>game.franchise_id===row.franchise_id);
      return std(rows.map((game:any)=>Number(game.score||0)));
    }),
    scoreVariance
  );
  const stabilityRank=100-percentile(
    data.franchise_metrics.map((row:any)=>std((row.season_finishes??[]).map((finish:any)=>Number(finish.finish)))),
    finishVariance
  );

  const wrShare=positionShare(metric,"WR");
  const rbShare=positionShare(metric,"RB");
  const qbShare=positionShare(metric,"QB");
  const teShare=positionShare(metric,"TE");

  const tags:ProfileTag[]=[];

  const add=(tag:ProfileTag)=>tags.push(tag);

  if(metric.championships>=2) add({label:"Banner Factory",icon:"🏆",detail:"Multiple championships place this franchise in the league's title class.",tone:"gold",score:100});
  else if(metric.championships===1) add({label:"Certified Champion",icon:"👑",detail:"Has finished the job and owns an OKFL title.",tone:"gold",score:94});

  if(metric.runner_ups>=3) add({label:"The Final Boss's Finalist",icon:"🥈",detail:"Reached the championship game repeatedly, including three runner-up finishes.",tone:"purple",score:99});
  else if(metric.runner_ups>=2) add({label:"Sunday Heartbreak Department",icon:"💔",detail:"A repeat finalist whose résumé is stronger than the ring count.",tone:"purple",score:92});
  else if(metric.runner_ups===1) add({label:"One Win Away",icon:"🥈",detail:"Has already reached the championship stage.",tone:"purple",score:76});

  if(tradeRank>=90) add({label:"Deal Desk Dictator",icon:"📞",detail:"One of the league's most active trade operators.",tone:"red",score:tradeRank});
  else if(tradeRank>=72) add({label:"Market Maker",icon:"🤝",detail:"Regularly reshapes the roster through trades.",tone:"red",score:tradeRank});
  else if(tradeRank<=25) add({label:"Hold-the-Line GM",icon:"🧱",detail:"Prefers continuity over constant dealing.",tone:"slate",score:100-tradeRank});

  if(keeperRank>=90) add({label:"Keeper Architect",icon:"🔐",detail:"Builds multi-year value through keeper planning.",tone:"green",score:keeperRank});
  else if(keeperRank>=70) add({label:"Contract-Year Planner",icon:"📅",detail:"Consistently extracts value from keeper windows.",tone:"green",score:keeperRank});

  if(lateRank>=90) add({label:"Day-Three Gold Miner",icon:"⛏️",detail:"Leads the league in late-round production and keeper creation.",tone:"gold",score:lateRank});
  else if(lateRank>=72) add({label:"Afterthought Alchemist",icon:"🧪",detail:"Turns overlooked picks into usable assets.",tone:"gold",score:lateRank});

  if(winRank>=90) add({label:"Regular-Season Metronome",icon:"📈",detail:"Wins at an elite rate across the full archive.",tone:"blue",score:winRank});
  else if(winRank>=72) add({label:"Weekly Pressure System",icon:"🌪️",detail:"Consistently forces opponents to keep pace.",tone:"blue",score:winRank});

  if(finishRank>=88) add({label:"Podium Resident",icon:"🏅",detail:"Lives near the top of the final bracket standings.",tone:"purple",score:finishRank});
  if(stabilityRank>=85) add({label:"Low-Drama Contender",icon:"🧊",detail:"Season results remain unusually steady year to year.",tone:"slate",score:stabilityRank});
  if(pressureRank>=88) add({label:"Volatility Merchant",icon:"🎢",detail:"Produces one of the league's widest weekly scoring ranges.",tone:"red",score:pressureRank});
  else if(pressureRank<=25) add({label:"Same-Day Delivery",icon:"📦",detail:"A more predictable weekly scoring profile than most of the league.",tone:"slate",score:100-pressureRank});

  const positionCandidates=[
    {share:wrShare,label:"Air-Raid Personnel Office",icon:"✈️",detail:"Draft capital leans heavily toward wide receivers."},
    {share:rbShare,label:"Backfield Industrial Complex",icon:"🏭",detail:"Draft strategy repeatedly prioritizes running backs."},
    {share:qbShare,label:"Quarterback Capitalist",icon:"💼",detail:"Invests more draft capital in quarterbacks than most franchises."},
    {share:teShare,label:"Tight End Department",icon:"🧰",detail:"Shows an unusual commitment to the tight end position."},
  ].sort((a,b)=>b.share-a.share);
  if(positionCandidates[0].share>=.25) {
    add({...positionCandidates[0],tone:"blue",score:65+positionCandidates[0].share*100} as ProfileTag);
  }

  if(legacyRank>=90&&!tags.some((tag)=>tag.label==="Banner Factory")) add({label:"Archive Heavyweight",icon:"📚",detail:"Ranks near the top of the league's total legacy model.",tone:"gold",score:legacyRank});
  if(metric.bottom_three===0&&metric.championships===0) add({label:"No Basement Lease",icon:"🚫",detail:"Has avoided bottom-three final finishes throughout the archive.",tone:"green",score:84});
  if(metric.best_finish<=2&&metric.worst_finish<=6) add({label:"Always in the Room",icon:"🚪",detail:"Never drifts far from meaningful contention.",tone:"blue",score:80});

  const uniqueTags=[...new Map(tags.sort((a,b)=>b.score-a.score).map((tag)=>[tag.label,tag])).values()].slice(0,5);

  const dna:DnaDimension[]=[
    {label:"Trading pulse",value:tradeRank,detail:`${metric.trade_count} completed trade participations`},
    {label:"Keeper craft",value:keeperRank,detail:`${metric.keeper_count} keeper events`},
    {label:"Draft excavation",value:lateRank,detail:`${metric.late_round_hits} late-round hits`},
    {label:"Winning pressure",value:winRank,detail:`${Number(metric.win_pct).toFixed(1)}% all-time win rate`},
    {label:"Scoring force",value:scoringRank,detail:`${Number(metric.avg_score).toFixed(1)} points per tracked team-week`},
    {label:"Finish quality",value:finishRank,detail:`${metric.average_finish} average final finish`},
    {label:"Stability",value:stabilityRank,detail:"Consistency of final finishes"},
    {label:"Weekly volatility",value:pressureRank,detail:"Spread of weekly point totals"},
  ];

  const signature=uniqueTags[0]??{
    label:"Balanced Front Office",
    icon:"⚖️",
    detail:"No single behavior overwhelms the rest of the franchise profile.",
    tone:"slate" as const,
    score:50,
  };

  const strongest=dna.slice().sort((a,b)=>b.value-a.value)[0];
  const weakest=dna.slice().sort((a,b)=>a.value-b.value)[0];

  return {
    franchise,
    metric,
    tags:uniqueTags,
    dna,
    signature,
    strongest,
    weakest,
    finishVariance,
    scoreVariance,
    summary:`${franchise.name} is best described as ${signature.label.toLowerCase()}. Its clearest data edge is ${strongest.label.toLowerCase()}, while ${weakest.label.toLowerCase()} is the least pronounced part of the profile.`,
    records:{
      bestGame:games.slice().sort((a:any,b:any)=>Number(b.score)-Number(a.score))[0]??null,
      worstGame:games.slice().sort((a:any,b:any)=>Number(a.score)-Number(b.score))[0]??null,
      biggestWin:games.filter((game:any)=>Number(game.margin)>0).sort((a:any,b:any)=>Number(b.margin)-Number(a.margin))[0]??null,
      closestGame:games.slice().sort((a:any,b:any)=>Math.abs(Number(a.margin))-Math.abs(Number(b.margin)))[0]??null,
    }
  };
}
