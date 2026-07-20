
import draftPlayerDepth from "./draft-player-depth.json";

export type DraftManager = {
  slot: number;
  franchiseId: string;
  name: string;
  manager: string;
  archetype: string;
  motto: string;
  tendencies: {
    qbAggression: number;
    youth: number;
    risk: number;
    keeperFocus: number;
    needWeight: number;
    veteran: number;
  };
};

export type DraftPlayer = {
  name: string;
  position: string;
  team: string;
  pprRank: number;
  pprValue: number;
  age?: number | null;
  keeperEligible: boolean;
  source?: string;
  marketAdp?: number;
};

export type DraftPick = {
  overall: number;
  round: number;
  slot: number;
  franchiseId: string;
  manager: string;
  player: DraftPlayer;
  keeper: boolean;
  keeperCost?: number;
  grade?: string;
  explanation: string[];
};

export type DraftMode = "realistic" | "balanced" | "chaos";

export const DRAFT_ROUNDS = 17;
export const OKFL_QB_PREMIUM_PICKS = 5;

export const managers: DraftManager[] = [
  {slot:1,franchiseId:"F02",name:"Blow",manager:"Blow",archetype:"Calculated Value",motto:"Wait for the room to make the mistake.",tendencies:{qbAggression:.67,youth:.54,risk:.34,keeperFocus:.78,needWeight:.80,veteran:.48}},
  {slot:2,franchiseId:"F04",name:"Isaac",manager:"Isaac",archetype:"Win-Now Builder",motto:"Proven production before projection.",tendencies:{qbAggression:.61,youth:.36,risk:.25,keeperFocus:.56,needWeight:.92,veteran:.84}},
  {slot:3,franchiseId:"F05",name:"Zvi",manager:"Zvi",archetype:"Balanced Constructor",motto:"Build the weekly lineup first.",tendencies:{qbAggression:.60,youth:.58,risk:.37,keeperFocus:.70,needWeight:.86,veteran:.53}},
  {slot:4,franchiseId:"F09",name:"Maurice",manager:"Maurice",archetype:"Backfield Investor",motto:"Secure volume before the RB cliff.",tendencies:{qbAggression:.63,youth:.55,risk:.35,keeperFocus:.66,needWeight:.88,veteran:.58}},
  {slot:5,franchiseId:"F08",name:"Haimy",manager:"Haimy",archetype:"Breakout Hunter",motto:"Upside today, keeper value tomorrow.",tendencies:{qbAggression:.66,youth:.92,risk:.70,keeperFocus:.92,needWeight:.70,veteran:.20}},
  {slot:6,franchiseId:"F01",name:"Aaron",manager:"Aaron",archetype:"Keeper Optimizer",motto:"Draft the value before the name.",tendencies:{qbAggression:.70,youth:.73,risk:.38,keeperFocus:.98,needWeight:.88,veteran:.38}},
  {slot:7,franchiseId:"F06",name:"Usher",manager:"Usher",archetype:"Floor General",motto:"Bank dependable starters.",tendencies:{qbAggression:.58,youth:.35,risk:.20,keeperFocus:.50,needWeight:.94,veteran:.90}},
  {slot:8,franchiseId:"F03",name:"Sammy",manager:"Sammy",archetype:"Chaos Upside",motto:"The ceiling is the strategy.",tendencies:{qbAggression:.50,youth:.68,risk:.82,keeperFocus:.64,needWeight:.64,veteran:.28}},
  {slot:9,franchiseId:"F10",name:"Sean/Ted",manager:"Sean/Ted",archetype:"Championship Machine",motto:"Complete the starting lineup early.",tendencies:{qbAggression:.71,youth:.44,risk:.27,keeperFocus:.60,needWeight:.96,veteran:.77}},
  {slot:10,franchiseId:"F07",name:"Gorb",manager:"Gorb",archetype:"Market Disruptor",motto:"Start the run before anyone is ready.",tendencies:{qbAggression:.88,youth:.62,risk:.98,keeperFocus:.54,needWeight:.57,veteran:.33}},
];

export const projectedKeepers = [
  {franchiseId:"F02",player:"Colston Loveland",round:10,position:"TE"},
  {franchiseId:"F02",player:"Puka Nacua",round:12,position:"WR"},
  {franchiseId:"F02",player:"Luther Burden III",round:13,position:"WR"},

  {franchiseId:"F04",player:"George Pickens",round:4,position:"WR"},
  {franchiseId:"F04",player:"Jameson Williams",round:5,position:"WR"},
  {franchiseId:"F04",player:"Jaxon Smith-Njigba",round:11,position:"WR"},

  {franchiseId:"F05",player:"Brock Bowers",round:4,position:"TE"},
  {franchiseId:"F05",player:"Chris Olave",round:6,position:"WR"},
  {franchiseId:"F05",player:"Jaxson Dart",round:14,position:"QB"},

  {franchiseId:"F09",player:"Malik Nabers",round:3,position:"WR"},
  {franchiseId:"F09",player:"James Cook",round:6,position:"RB"},
  {franchiseId:"F09",player:"Javonte Williams",round:10,position:"RB"},

  {franchiseId:"F08",player:"Rashee Rice",round:5,position:"WR"},
  {franchiseId:"F08",player:"Drake Maye",round:7,position:"QB"},
  {franchiseId:"F08",player:"De'Von Achane",round:9,position:"RB"},

  {franchiseId:"F01",player:"Ladd McConkey",round:5,position:"WR"},
  {franchiseId:"F01",player:"Trevor Lawrence",round:10,position:"QB"},
  {franchiseId:"F01",player:"Chase Brown",round:12,position:"RB"},

  {franchiseId:"F06",player:"Jonathan Taylor",round:3,position:"RB"},
  {franchiseId:"F06",player:"Tetairoa McMillan",round:4,position:"WR"},
  {franchiseId:"F06",player:"Jaylen Waddle",round:6,position:"WR"},

  {franchiseId:"F03",player:"Rome Odunze",round:7,position:"WR"},
  {franchiseId:"F03",player:"Kyren Williams",round:12,position:"RB"},

  {franchiseId:"F10",player:"Trey McBride",round:4,position:"TE"},
  {franchiseId:"F10",player:"Wan'Dale Robinson",round:13,position:"WR"},
  {franchiseId:"F10",player:"Daniel Jones",round:14,position:"QB"},

  {franchiseId:"F07",player:"Cam Skattebo",round:8,position:"RB"},
  {franchiseId:"F07",player:"Sam Darnold",round:13,position:"QB"},
  {franchiseId:"F07",player:"Dallas Goedert",round:15,position:"TE"},
];

const starterTargets:Record<string,number>={QB:2,RB:2,WR:3,TE:1,K:1,DEF:1};

export function snakeSlot(round:number,pickInRound:number){
  return round%2===1?pickInRound:11-pickInRound;
}

export function overallToRoundSlot(overall:number){
  const round=Math.floor((overall-1)/10)+1;
  const pickInRound=((overall-1)%10)+1;
  return {round,slot:snakeSlot(round,pickInRound),pickInRound};
}

export function keeperOverall(round:number,slot:number){
  const pickInRound=round%2===1?slot:11-slot;
  return (round-1)*10+pickInRound;
}

export function pprAdjustedRank(player:DraftPlayer){
  return Math.max(1,player.pprRank-(player.position==="QB"?OKFL_QB_PREMIUM_PICKS:0));
}

export function pprAdjustedValue(player:DraftPlayer){
  const base=player.pprValue||Math.max(250,10000-(player.pprRank-1)*100);
  return base+(player.position==="QB"?OKFL_QB_PREMIUM_PICKS*100:0);
}

export function draftRankLabel(player:DraftPlayer){
  return player.marketAdp?`PPR ADP ${player.marketAdp.toFixed(1)}`:`PPR rank ${player.pprRank}`;
}

export function teamRoster(picks:DraftPick[],franchiseId:string){
  return picks.filter((pick)=>pick.franchiseId===franchiseId).map((pick)=>pick.player);
}

function counts(roster:DraftPlayer[]){
  const result:Record<string,number>={};
  for(const player of roster)result[player.position]=(result[player.position]||0)+1;
  return result;
}

export function keeperUpside(player:DraftPlayer,round:number){
  if(round<=3||!player.keeperEligible)return 0;
  const adjustedRound=Math.ceil(pprAdjustedRank(player)/10);
  return Math.max(0,(round-adjustedRound)*115);
}

function positionScarcity(pool:DraftPlayer[],position:string){
  const rows=pool.filter((player)=>player.position===position).sort((a,b)=>pprAdjustedRank(a)-pprAdjustedRank(b));
  if(rows.length<2)return 0;
  const first=pprAdjustedValue(rows[0]);
  const comparison=pprAdjustedValue(rows[Math.min(5,rows.length-1)]);
  return Math.max(0,Math.min(650,first-comparison));
}

function positionPreference(manager:DraftManager,position:string){
  if(manager.franchiseId==="F09"&&position==="RB")return 190;
  if(manager.franchiseId==="F08"&&(position==="WR"||position==="RB"))return 145;
  if(manager.franchiseId==="F07"&&position==="QB")return 240;
  if(manager.franchiseId==="F03"&&position==="WR")return 130;
  if(manager.franchiseId==="F06"&&(position==="RB"||position==="WR"))return 110;
  if(manager.franchiseId==="F10"&&position==="QB")return 120;
  return 0;
}

export function scorePlayer(params:{
  player:DraftPlayer;
  manager:DraftManager;
  roster:DraftPlayer[];
  pool:DraftPlayer[];
  round:number;
  seed:number;
  mode?:DraftMode;
}){
  const {player,manager,roster,pool,round,seed,mode="realistic"}=params;
  const rosterCounts=counts(roster);
  const target=starterTargets[player.position]||0;
  const missing=Math.max(0,target-(rosterCounts[player.position]||0));

  const personalityStrength=mode==="balanced"?.45:mode==="chaos"?1.35:1;
  const needStrength=mode==="balanced"?1.15:mode==="chaos"?.7:1;
  const volatility=mode==="balanced"?.4:mode==="chaos"?2.25:1;
  const need=missing*230*manager.tendencies.needWeight*needStrength;
  const qbNeed=player.position==="QB"&&missing>0?260*manager.tendencies.qbAggression:0;
  const youth=player.age?Math.max(-250,(27-player.age)*34*manager.tendencies.youth):0;
  const veteran=player.age?Math.max(0,(player.age-27)*28*manager.tendencies.veteran):0;
  const keeper=keeperUpside(player,round)*manager.tendencies.keeperFocus;
  const scarcity=positionScarcity(pool,player.position)*.65;
  const personality=positionPreference(manager,player.position)*personalityStrength;

  // A per-mock seed keeps one draft stable while allowing the next mock to develop differently.
  const hashInput=`${seed}:${manager.slot}:${round}:${player.name}`;
  let hash=2166136261;
  for(const char of hashInput){
    hash^=char.charCodeAt(0);
    hash=Math.imul(hash,16777619);
  }
  const normalized=(hash>>>0)/4294967295*2-1;
  const variation=normalized*(90+manager.tendencies.risk*360)*volatility;

  return pprAdjustedValue(player)+need+qbNeed+youth+veteran+keeper+scarcity+personality+variation;
}

export function explainPick(params:{
  player:DraftPlayer;
  manager:DraftManager;
  roster:DraftPlayer[];
  pool:DraftPlayer[];
  round:number;
}){
  const {player,manager,roster,pool,round}=params;
  const rosterCounts=counts(roster);
  const notes:string[]=[];

  notes.push(`${draftRankLabel(player)}${player.position==="QB"?`, adjusted to board rank ${pprAdjustedRank(player)} for OKFL quarterback demand`:""}.`);
  if((starterTargets[player.position]||0)>(rosterCounts[player.position]||0))
    notes.push(`Fills an open ${player.position} starter slot.`);
  if(keeperUpside(player,round)>=250)
    notes.push(`Round ${round} creates meaningful future keeper surplus.`);
  if(positionScarcity(pool,player.position)>=300)
    notes.push(`${player.position} has a sharp tier drop approaching.`);
  if(manager.tendencies.youth>.75&&player.age&&player.age<=24)
    notes.push(`Matches ${manager.manager}'s youth-heavy profile.`);
  if(manager.tendencies.veteran>.75&&player.age&&player.age>=28)
    notes.push(`Matches ${manager.manager}'s preference for proven veterans.`);
  if(manager.franchiseId==="F07"&&player.position==="QB")
    notes.push("Gorb's model is the league's most aggressive quarterback trigger.");

  return notes.slice(0,4);
}

export function pickGrade(player:DraftPlayer,overall:number){
  const expected=pprAdjustedRank(player);
  const difference=expected-overall;
  if(difference>=18)return"A+";
  if(difference>=9)return"A";
  if(difference>=2)return"B+";
  if(difference>=-7)return"B";
  if(difference>=-16)return"C";
  return"D";
}

export function fallbackPprPool():DraftPlayer[]{
  const rows=[
    ["Bijan Robinson","RB","ATL",1,10000,24],["Ja'Marr Chase","WR","CIN",2,9850,26],
    ["Jahmyr Gibbs","RB","DET",3,9700,24],["Justin Jefferson","WR","MIN",4,9550,27],
    ["CeeDee Lamb","WR","DAL",5,9400,27],["Amon-Ra St. Brown","WR","DET",6,9250,26],
    ["Puka Nacua","WR","LAR",7,9100,25],["Malik Nabers","WR","NYG",8,8950,23],
    ["Saquon Barkley","RB","PHI",9,8800,29],["Nico Collins","WR","HOU",10,8650,27],
    ["Ashton Jeanty","RB","LV",11,8500,22],["Josh Allen","QB","BUF",12,8350,30],
    ["Breece Hall","RB","NYJ",13,8200,25],["Brian Thomas Jr.","WR","JAX",14,8050,23],
    ["Lamar Jackson","QB","BAL",15,7900,29],["A.J. Brown","WR","PHI",16,7750,29],
    ["Garrett Wilson","WR","NYJ",17,7600,26],["Jalen Hurts","QB","PHI",18,7450,27],
    ["Josh Jacobs","RB","GB",19,7300,28],["Tee Higgins","WR","CIN",20,7150,27],
    ["Jayden Daniels","QB","WAS",21,7000,25],["Omarion Hampton","RB","LAC",22,6850,23],
    ["Marvin Harrison Jr.","WR","ARI",23,6700,24],["Joe Burrow","QB","CIN",24,6550,29],
    ["Derrick Henry","RB","BAL",25,6400,32],["Terry McLaurin","WR","WAS",26,6250,31],
    ["Patrick Mahomes","QB","KC",27,6100,30],["Zay Flowers","WR","BAL",28,5950,25],
    ["TreVeyon Henderson","RB","NE",29,5800,23],["Sam LaPorta","TE","DET",30,5650,25],
    ["Caleb Williams","QB","CHI",31,5500,24],["DK Metcalf","WR","PIT",32,5350,28],
    ["George Kittle","TE","SF",33,5200,32],["Bo Nix","QB","DEN",34,5050,26],
    ["DeVonta Smith","WR","PHI",35,4900,27],["Jordan Love","QB","GB",36,4750,27],
    ["Mike Evans","WR","TB",37,4600,33],["Baker Mayfield","QB","TB",38,4450,31],
    ["Alvin Kamara","RB","NO",39,4300,31],["Brock Purdy","QB","SF",40,4150,26],
    ["DJ Moore","WR","CHI",41,4000,29],["Kyler Murray","QB","ARI",42,3850,29],
    ["Xavier Worthy","WR","KC",43,3700,23],["C.J. Stroud","QB","HOU",44,3550,24],
    ["Mark Andrews","TE","BAL",45,3400,31],["Dak Prescott","QB","DAL",46,3250,33],
    ["David Montgomery","RB","DET",47,3100,29],["Justin Herbert","QB","LAC",48,2950,28],
    ["Jordan Addison","WR","MIN",49,2800,24],["Kyle Pitts","TE","ATL",50,2650,25],
    ["Tony Pollard","RB","TEN",51,2500,29],["Ricky Pearsall","WR","SF",52,2400,25],
    ["Courtland Sutton","WR","DEN",53,2300,31],["Jake Ferguson","TE","DAL",54,2200,27],
    ["Rhamondre Stevenson","RB","NE",55,2100,28],["T.J. Hockenson","TE","MIN",56,2000,29],
    ["Jaylen Warren","RB","PIT",57,1900,27],["Romeo Doubs","WR","GB",58,1800,26],
    ["Aaron Jones","RB","MIN",59,1700,31],["Najee Harris","RB","LAC",60,1600,28],
    ["Matthew Stafford","QB","LAR",61,1500,38],["Geno Smith","QB","LV",62,1450,35],
    ["Jared Goff","QB","DET",63,1400,31],["Michael Penix Jr.","QB","ATL",64,1350,26],
    ["Bryce Young","QB","CAR",65,1300,25],["Anthony Richardson","QB","IND",66,1250,24],
    ["Christian Kirk","WR","HOU",67,1200,29],["Jerry Jeudy","WR","CLE",68,1150,27],
    ["Isiah Pacheco","RB","KC",69,1100,27],["Travis Kelce","TE","KC",70,1050,36],
    ["Stefon Diggs","WR","NE",71,1000,32],["D'Andre Swift","RB","CHI",72,950,27],
    ["Calvin Ridley","WR","TEN",73,900,31],["Brian Robinson Jr.","RB","WAS",74,850,27],
    ["Tyjae Spears","RB","TEN",75,800,25],["Khalil Shakir","WR","BUF",76,760,26],
    ["Pat Freiermuth","TE","PIT",77,720,27],["Dalton Kincaid","TE","BUF",78,680,26],
    ["Cooper Kupp","WR","SEA",79,640,33],["Rashid Shaheed","WR","NO",80,600,28],
    ["Russell Wilson","QB","NYG",81,570,37],["Kirk Cousins","QB","ATL",82,540,38],
    ["Zach Charbonnet","RB","SEA",83,510,25],["Keon Coleman","WR","BUF",84,480,23],
    ["Tank Dell","WR","HOU",85,450,26],["Dallas Goedert","TE","PHI",86,420,31],
    ["Jerome Ford","RB","CLE",87,390,26],["Tyler Lockett","WR","TEN",88,360,33],
    ["Hunter Henry","TE","NE",89,330,31],["Roschon Johnson","RB","CHI",90,300,25],
  ];

  const rankedDepth=draftPlayerDepth.map((player,index)=>({
    name:player.name,
    position:player.position,
    team:player.team,
    pprRank:rows.length+index+1,
    pprValue:Math.max(250,10000-(rows.length+index)*100),
    age:null,
    keeperEligible:true,
    source:"2025-archive-depth",
  }));

  return [...rows.map((row)=>({
    name:String(row[0]),position:String(row[1]),team:String(row[2]),
    pprRank:Number(row[3]),pprValue:Number(row[4]),age:Number(row[5]),
    keeperEligible:true,source:"ppr-fallback"
  })),...rankedDepth];
}

export function draftReport(picks:DraftPick[],franchiseId:string){
  const team=picks.filter((pick)=>pick.franchiseId===franchiseId);
  const live=team.filter((pick)=>!pick.keeper);
  const gradePoints:Record<string,number>={"A+":4.3,A:4,"B+":3.4,B:3,C:2,D:1};
  const average=live.length?live.reduce((sum,pick)=>sum+(gradePoints[pick.grade||"C"]||2),0)/live.length:0;
  const rosterCounts=counts(team.map((pick)=>pick.player));
  const filled=Object.entries(starterTargets).filter(([position,target])=>(rosterCounts[position]||0)>=target).length;
  const coverage=Math.round(filled/Object.keys(starterTargets).length*100);
  const steals=live.filter((pick)=>["A+","A"].includes(pick.grade||"")).length;
  const reaches=live.filter((pick)=>pick.grade==="D").length;
  const score=Math.max(0,Math.min(100,Math.round(average/4.3*72+coverage*.23+Math.min(5,steals)*2-reaches*2)));
  const grade=score>=94?"A+":score>=88?"A":score>=82?"B+":score>=75?"B":score>=66?"C":"D";
  return {grade,score,coverage,steals,reaches,totalPlayers:team.length};
}
