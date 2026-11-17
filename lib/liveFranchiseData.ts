import type {LeagueDashboard} from "@/lib/liveLeague";
import type {OKFLData} from "@/lib/types";

const LIVE_SEASON=2026;

function resultFor(pointsFor:number,pointsAgainst:number){
  return pointsFor>pointsAgainst?"W":pointsFor<pointsAgainst?"L":"T";
}

export function mergeLiveFranchiseData(data:OKFLData,dashboard:LeagueDashboard,snapshot:any):OKFLData{
  if(!dashboard.available||!dashboard.standings.length)return data;

  // Once 2026 is certified into the archive, that official season replaces the live overlay.
  if(data.regular_standings.some((row:any)=>Number(row.season)===LIVE_SEASON))return data;

  const completedGames=dashboard.matchups.filter((game)=>game.complete&&game.week<=dashboard.completedWeek);
  const liveWeeklyGames=completedGames.flatMap((game)=>[
    {
      season:LIVE_SEASON,week:game.week,franchise_id:game.home.franchiseId,franchise:game.home.franchise,
      opponent_id:game.away.franchiseId,opponent:game.away.franchise,score:game.homePoints,opp_score:game.awayPoints,
      margin:game.homePoints-game.awayPoints,result:resultFor(game.homePoints,game.awayPoints),playoff:false,source:"Sleeper live sync"
    },
    {
      season:LIVE_SEASON,week:game.week,franchise_id:game.away.franchiseId,franchise:game.away.franchise,
      opponent_id:game.home.franchiseId,opponent:game.home.franchise,score:game.awayPoints,opp_score:game.homePoints,
      margin:game.awayPoints-game.homePoints,result:resultFor(game.awayPoints,game.homePoints),playoff:false,source:"Sleeper live sync"
    }
  ]);

  const tradeCounts=new Map<string,number>();
  for(const trade of snapshot?.trades??[]){
    for(const side of trade.sides??[]){
      const id=String(side.franchise_id??"");
      if(id)tradeCounts.set(id,(tradeCounts.get(id)??0)+1);
    }
  }

  const standingsById=new Map(dashboard.standings.map((standing,index)=>[standing.franchiseId,{...standing,rank:index+1}]));
  const liveStandings=dashboard.standings.map((standing,index)=>({
    season:LIVE_SEASON,rank:index+1,franchise_id:standing.franchiseId,franchise:standing.franchise,
    record:`${standing.wins}-${standing.losses}${standing.ties?`-${standing.ties}`:""}`,
    wins:standing.wins,losses:standing.losses,ties:standing.ties,
    win_pct:Math.round((standing.wins+standing.ties*.5)/Math.max(1,standing.wins+standing.losses+standing.ties)*1000)/10,
    points:standing.points,source:"Sleeper live sync",live:true,through_week:dashboard.completedWeek
  }));

  const franchiseMetrics=data.franchise_metrics.map((metric)=>{
    const standing=standingsById.get(metric.franchise_id);
    if(!standing)return metric;
    const liveGames=standing.wins+standing.losses+standing.ties;
    const baseGames=Number(metric.wins)+Number(metric.losses)+Number(metric.ties||0);
    const wins=Number(metric.wins)+standing.wins;
    const losses=Number(metric.losses)+standing.losses;
    const ties=Number(metric.ties||0)+standing.ties;
    const totalGames=baseGames+liveGames;
    const pointsAgainst=liveWeeklyGames.filter((game:any)=>game.franchise_id===metric.franchise_id).reduce((sum:number,game:any)=>sum+Number(game.opp_score||0),0);
    return {
      ...metric,
      wins,losses,ties,
      pf:Math.round((Number(metric.pf||0)+standing.points)*100)/100,
      pa:Math.round((Number(metric.pa||0)+pointsAgainst)*100)/100,
      win_pct:Math.round((wins+ties*.5)/Math.max(1,totalGames)*1000)/10,
      avg_score:Math.round(((Number(metric.avg_score||0)*baseGames+standing.points)/Math.max(1,totalGames))*10)/10,
      trade_count:Number(metric.trade_count||0)+(tradeCounts.get(metric.franchise_id)??0)
    };
  });

  const liveSummary=Object.fromEntries(dashboard.standings.map((standing,index)=>[standing.franchiseId,{
    rank:index+1,record:`${standing.wins}-${standing.losses}${standing.ties?`-${standing.ties}`:""}`,
    wins:standing.wins,losses:standing.losses,ties:standing.ties,points:standing.points,
    streak:standing.streak,powerRank:standing.powerRank,throughWeek:dashboard.completedWeek
  }]));

  return {
    ...data,
    franchise_metrics:franchiseMetrics,
    regular_standings:[...data.regular_standings,...liveStandings],
    weekly_games:[...data.weekly_games,...liveWeeklyGames],
    live_2026:{available:true,syncedAt:dashboard.syncedAt,currentWeek:dashboard.currentWeek,completedWeek:dashboard.completedWeek,standings:liveSummary}
  };
}
