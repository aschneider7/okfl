import type {DraftPick, DraftPlayer} from "./draftSimulator.ts";

const STARTER_TARGETS:Record<string,number>={QB:2,RB:2,WR:3,TE:1,K:1,DEF:1};

function adjustedRank(player:DraftPlayer){
  return player.position==="QB"?(player.okflRank??player.pprRank):player.pprRank;
}

function keeperOverall(round:number,slot:number){
  const pickInRound=round%2===1?slot:11-slot;
  return (round-1)*10+pickInRound;
}

function counts(roster:DraftPlayer[]){
  const result:Record<string,number>={};
  for(const player of roster)result[player.position]=(result[player.position]||0)+1;
  return result;
}

export function draftExpectedRank(player:DraftPlayer){
  if(player.position==="DEF")return Math.min(adjustedRank(player),145);
  if(player.position==="K")return Math.min(adjustedRank(player),155);
  return adjustedRank(player);
}

export function pickGrade(player:DraftPlayer,overall:number){
  const valueRounds=(overall-draftExpectedRank(player))/10;
  if(valueRounds>=1.8)return"A+";
  if(valueRounds>=.9)return"A";
  if(valueRounds>=.25)return"B+";
  if(valueRounds>=-.6)return"B";
  if(valueRounds>=-1.4)return"C";
  return"D";
}

export function draftReport(picks:DraftPick[],franchiseId:string){
  const team=picks.filter((pick)=>pick.franchiseId===franchiseId);
  const live=team.filter((pick)=>!pick.keeper);
  const rosterCounts=counts(team.map((pick)=>pick.player));
  const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));

  const weightedValue=live.reduce((result,pick)=>{
    const surplusRounds=clamp((pick.overall-draftExpectedRank(pick.player))/10,-3,3);
    const weight=pick.round<=5?1.35:pick.round<=10?1:.75;
    return {points:result.points+surplusRounds*weight,weight:result.weight+weight};
  },{points:0,weight:0});
  const averageSurplus=weightedValue.weight?weightedValue.points/weightedValue.weight:0;
  const valueScore=Math.round(clamp(72+averageSurplus*9));

  const starterBenchmarks:Record<string,number[]>={
    QB:[30,70],RB:[30,65],WR:[35,70,105],TE:[60],K:[999],DEF:[999],
  };
  let filledSlots=0;
  let lineupPoints=0;
  for(const [position,benchmarks] of Object.entries(starterBenchmarks)){
    const players=team.map((pick)=>pick.player).filter((player)=>player.position===position)
      .sort((a,b)=>adjustedRank(a)-adjustedRank(b));
    benchmarks.forEach((benchmark,index)=>{
      const player=players[index];
      if(!player)return;
      filledSlots+=1;
      lineupPoints+=position==="K"||position==="DEF"
        ?85
        :clamp(82+(benchmark-adjustedRank(player))*.35,55,100);
    });
  }
  const totalStarterSlots=Object.values(STARTER_TARGETS).reduce((sum,target)=>sum+target,0);
  const coverage=Math.round(filledSlots/totalStarterSlots*100);
  const lineupScore=Math.round(clamp(lineupPoints/totalStarterSlots));

  let constructionPenalty=0;
  constructionPenalty+=Math.max(0,(rosterCounts.K||0)-1)*14;
  constructionPenalty+=Math.max(0,(rosterCounts.DEF||0)-1)*14;
  constructionPenalty+=Math.max(0,(rosterCounts.QB||0)-3)*7;
  constructionPenalty+=Math.max(0,(rosterCounts.TE||0)-2)*6;
  constructionPenalty+=Math.max(0,4-(rosterCounts.RB||0))*6;
  constructionPenalty+=Math.max(0,5-(rosterCounts.WR||0))*5;
  constructionPenalty+=(totalStarterSlots-filledSlots)*10;
  const constructionScore=Math.round(clamp(100-constructionPenalty));

  const keeperScores=team.filter((pick)=>pick.keeper).map((pick)=>{
    const cost=keeperOverall(pick.keeperCost||pick.round,pick.slot);
    const surplusRounds=(cost-draftExpectedRank(pick.player))/10;
    return clamp(70+surplusRounds*6,35,100);
  });
  const keeperScore=Math.round(keeperScores.length
    ?keeperScores.reduce((sum,score)=>sum+score,0)/keeperScores.length
    :75);

  const steals=live.filter((pick)=>["A+","A"].includes(pick.grade||"")).length;
  const reaches=live.filter((pick)=>pick.grade==="D").length;
  const score=Math.round(clamp(valueScore*.40+lineupScore*.30+constructionScore*.15+keeperScore*.15));
  const grade=score>=93?"A+":score>=88?"A":score>=82?"B+":score>=75?"B":score>=69?"C+":score>=62?"C":"D";
  return {grade,score,valueScore,lineupScore,constructionScore,keeperScore,coverage,steals,reaches,totalPlayers:team.length};
}
