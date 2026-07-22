import type {AwardsRace} from "@/lib/leagueAwards";
import type {LeagueDashboard} from "@/lib/liveLeague";
import type {PowerRanking} from "@/lib/powerRankings";

export type RecapSection={key:string;label:string;body:string};
export type CommissionerRecap={id?:string;season:number;week:number;status:"draft"|"published";headline:string;dek:string;quote:string;sections:RecapSection[];publishedAt?:string|null;updatedAt?:string|null;updatedBy?:string|null};

const score=(value:number)=>value.toFixed(1);

export function generateCommissionerRecap(dashboard:LeagueDashboard,awards:AwardsRace|null,power:PowerRanking[],week:number):CommissionerRecap{
  const games=dashboard.matchups.filter((game)=>game.week===week&&game.complete);
  const ordered=[...games].sort((a,b)=>Math.max(b.homePoints,b.awayPoints)-Math.max(a.homePoints,a.awayPoints));
  const top=ordered[0],close=[...games].sort((a,b)=>Math.abs(a.homePoints-a.awayPoints)-Math.abs(b.homePoints-b.awayPoints))[0];
  const winner=top?(top.homePoints>top.awayPoints?top.home:top.away):null;
  const stories=ordered.map((game)=>{const winning=game.homePoints>game.awayPoints?game.home:game.away,losing=winning===game.home?game.away:game.home,high=Math.max(game.homePoints,game.awayPoints),low=Math.min(game.homePoints,game.awayPoints),margin=high-low;return `${winning.franchise} ${margin<5?"survived":"defeated"} ${losing.franchise}, ${score(high)}–${score(low)}. ${margin<5?"The result stayed in doubt until the final scoring swing.":margin>=30?"It was a statement result with postseason-race consequences.":`${winning.manager}'s lineup built enough separation to close out a ${score(margin)}-point win.`}`;});
  const leaders=awards?.weeklyLeaders[String(week)]??[];
  const before=dashboard.matchups.filter((game)=>game.complete&&game.week<week);
  const previousWins=new Map<string,number>();for(const game of before){const winning=game.homePoints>game.awayPoints?game.home:game.away;previousWins.set(winning.franchiseId,(previousWins.get(winning.franchiseId)??0)+1)}
  const movement=[...dashboard.standings].sort((a,b)=>b.wins-a.wins||b.points-a.points).slice(0,4).map((team,index)=>`${index+1}. ${team.franchise} (${team.wins}-${team.losses}, ${score(team.points)} PF)`).join("; ");
  const bubble=[...dashboard.standings].sort((a,b)=>b.wins-a.wins||b.points-a.points).slice(4,7);
  return {season:2026,week,status:"draft",headline:winner?`${winner.franchise} seizes the Week ${week} spotlight`:`Week ${week}: the race takes shape`,dek:winner?`${winner.manager}'s team posted the league's high score as the standings and playoff picture shifted again.`:"The latest OKFL results changed the shape of the season.",quote:winner?`“You do not win the league in Week ${week}, but you can absolutely change how everyone sees the race.” — Commissioner’s desk`:"“Every result matters more from here.” — Commissioner’s desk",sections:[
    {key:"matchups",label:"Around the league",body:stories.join("\n\n")||"Final matchup results will appear here after the Sleeper sync."},
    {key:"awards",label:"Weekly awards",body:leaders.length?`${leaders[0].name} is Player of the Week after scoring ${score(leaders[0].points)} for ${leaders[0].franchise}. ${winner?`${winner.manager} earns Manager of the Week honors after leading ${winner.franchise} to the top team score.`:""}${close?` The game of the week was ${close.home.franchise} against ${close.away.franchise}, decided by ${score(Math.abs(close.homePoints-close.awayPoints))}.`:""}`:"Player awards are pending final scoring."},
    {key:"standings",label:"Standings movement",body:`The top of the table after Week ${week}: ${movement}. ${power[0]?`${power[0].franchise} remains the model's No. 1 team with a ${power[0].score} power score.`:""}`},
    {key:"playoffs",label:"Playoff implications",body:bubble.length?`${bubble.map((team)=>team.franchise).join(", ")} occupy the pressure zone around the playoff cut. With ${Math.max(0,14-week)} regular-season weeks left, points-for tiebreakers and every head-to-head result remain live.`:"The postseason picture will sharpen as more results become final."},
  ]};
}

export function normalizeRecap(value:any):CommissionerRecap{
  return {id:value?.id?String(value.id):undefined,season:Number(value?.season)||2026,week:Math.max(1,Math.min(18,Number(value?.week)||1)),status:value?.status==="published"?"published":"draft",headline:String(value?.headline||"").trim().slice(0,180),dek:String(value?.dek||"").trim().slice(0,400),quote:String(value?.quote||"").trim().slice(0,500),sections:(Array.isArray(value?.sections)?value.sections:[]).slice(0,8).map((row:any,index:number)=>({key:String(row?.key||`section-${index}`).slice(0,40),label:String(row?.label||"Section").trim().slice(0,80),body:String(row?.body||"").trim().slice(0,8000)})),publishedAt:value?.published_at??value?.publishedAt??null,updatedAt:value?.updated_at??value?.updatedAt??null,updatedBy:value?.updated_by_name??value?.updatedBy??null};
}
