
export type DraftManager = {
  slot: number;
  franchiseId: string;
  name: string;
  manager: string;
  tendencies: {
    qbAggression: number;
    youth: number;
    risk: number;
    keeperFocus: number;
    needWeight: number;
  };
};

export type DraftPlayer = {
  name: string;
  position: string;
  team: string;
  marketValue: number;
  rank: number;
  pprRank?: number;
  age?: number | null;
  keeperEligible: boolean;
  source?: string;
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
  explanation: string[];
};

export const DRAFT_ROUNDS = 17;

export const managers: DraftManager[] = [
  { slot:1, franchiseId:"F02", name:"Blow", manager:"Blow", tendencies:{qbAggression:.82,youth:.54,risk:.52,keeperFocus:.78,needWeight:.82}},
  { slot:2, franchiseId:"F04", name:"Isaac", manager:"Isaac", tendencies:{qbAggression:.72,youth:.42,risk:.38,keeperFocus:.60,needWeight:.90}},
  { slot:3, franchiseId:"F05", name:"Zvi", manager:"Zvi", tendencies:{qbAggression:.68,youth:.63,risk:.48,keeperFocus:.74,needWeight:.82}},
  { slot:4, franchiseId:"F09", name:"Maurice", manager:"Maurice", tendencies:{qbAggression:.76,youth:.58,risk:.42,keeperFocus:.68,needWeight:.85}},
  { slot:5, franchiseId:"F08", name:"Haimy", manager:"Haimy", tendencies:{qbAggression:.78,youth:.88,risk:.67,keeperFocus:.86,needWeight:.74}},
  { slot:6, franchiseId:"F01", name:"Aaron", manager:"Aaron", tendencies:{qbAggression:.84,youth:.73,risk:.45,keeperFocus:.95,needWeight:.90}},
  { slot:7, franchiseId:"F06", name:"Usher", manager:"Usher", tendencies:{qbAggression:.70,youth:.40,risk:.34,keeperFocus:.58,needWeight:.92}},
  { slot:8, franchiseId:"F03", name:"Sammy", manager:"Sammy", tendencies:{qbAggression:.58,youth:.64,risk:.74,keeperFocus:.67,needWeight:.72}},
  { slot:9, franchiseId:"F10", name:"Sean/Ted", manager:"Sean/Ted", tendencies:{qbAggression:.86,youth:.50,risk:.40,keeperFocus:.66,needWeight:.94}},
  { slot:10, franchiseId:"F07", name:"Gorb", manager:"Gorb", tendencies:{qbAggression:.96,youth:.61,risk:.95,keeperFocus:.58,needWeight:.63}},
];

export const projectedKeepers = [
  {franchiseId:"F02", player:"Colston Loveland", round:10, position:"TE"},
  {franchiseId:"F02", player:"Puka Nacua", round:12, position:"WR"},
  {franchiseId:"F02", player:"Luther Burden III", round:13, position:"WR"},

  {franchiseId:"F04", player:"George Pickens", round:4, position:"WR"},
  {franchiseId:"F04", player:"Jameson Williams", round:5, position:"WR"},
  {franchiseId:"F04", player:"Jaxon Smith-Njigba", round:11, position:"WR"},

  {franchiseId:"F05", player:"Brock Bowers", round:4, position:"TE"},
  {franchiseId:"F05", player:"Chris Olave", round:6, position:"WR"},
  {franchiseId:"F05", player:"Jaxson Dart", round:14, position:"QB"},

  {franchiseId:"F09", player:"Malik Nabers", round:3, position:"WR"},
  {franchiseId:"F09", player:"James Cook", round:6, position:"RB"},
  {franchiseId:"F09", player:"Javonte Williams", round:10, position:"RB"},

  {franchiseId:"F08", player:"Rashee Rice", round:5, position:"WR"},
  {franchiseId:"F08", player:"Drake Maye", round:7, position:"QB"},
  {franchiseId:"F08", player:"De'Von Achane", round:9, position:"RB"},

  {franchiseId:"F01", player:"Ladd McConkey", round:5, position:"WR"},
  {franchiseId:"F01", player:"Trevor Lawrence", round:10, position:"QB"},
  {franchiseId:"F01", player:"Chase Brown", round:12, position:"RB"},

  {franchiseId:"F06", player:"Jonathan Taylor", round:3, position:"RB"},
  {franchiseId:"F06", player:"Tetairoa McMillan", round:4, position:"WR"},
  {franchiseId:"F06", player:"Jaylen Waddle", round:6, position:"WR"},

  {franchiseId:"F03", player:"Rome Odunze", round:7, position:"WR"},
  {franchiseId:"F03", player:"Kyren Williams", round:12, position:"RB"},

  {franchiseId:"F10", player:"Trey McBride", round:4, position:"TE"},
  {franchiseId:"F10", player:"Wan'Dale Robinson", round:13, position:"WR"},
  {franchiseId:"F10", player:"Daniel Jones", round:14, position:"QB"},

  {franchiseId:"F07", player:"Cam Skattebo", round:8, position:"RB"},
  {franchiseId:"F07", player:"Sam Darnold", round:13, position:"QB"},
  {franchiseId:"F07", player:"Dallas Goedert", round:15, position:"TE"},
];

const rosterTargets: Record<string, number> = {
  QB: 2,
  RB: 2,
  WR: 3,
  TE: 1,
  FLEX: 1,
};

export const OKFL_QB_PREMIUM_ROUNDS = 0.40;
export const OKFL_QB_PREMIUM_POINTS = Math.round(OKFL_QB_PREMIUM_ROUNDS * 10) * 55;

export function pprBaseValue(player: DraftPlayer) {
  const rank = player.pprRank ?? player.rank;
  return Math.max(250, 10000 - (rank - 1) * 105);
}

export function okflAdjustedMarketValue(player: DraftPlayer) {
  const base = pprBaseValue(player);
  if (player.position !== "QB") return base;
  return base + OKFL_QB_PREMIUM_POINTS;
}

export function snakeSlot(round:number, pickInRound:number) {
  return round % 2 === 1 ? pickInRound : 11 - pickInRound;
}

export function overallToRoundSlot(overall:number) {
  const round = Math.floor((overall - 1) / 10) + 1;
  const pickInRound = ((overall - 1) % 10) + 1;
  return {round, slot:snakeSlot(round,pickInRound)};
}

export function teamRoster(picks:DraftPick[], franchiseId:string) {
  return picks.filter((pick)=>pick.franchiseId===franchiseId).map((pick)=>pick.player);
}

export function positionCounts(players:DraftPlayer[]) {
  const counts:Record<string,number> = {};
  for(const player of players) counts[player.position]=(counts[player.position]||0)+1;
  return counts;
}

export function keeperAdjustedValue(player:DraftPlayer, round:number) {
  if(!player.keeperEligible || round<=3) return 0;
  const futureCost = Math.max(1, round-1);
  const expectedRound = Math.max(1, Math.ceil(player.rank/10));
  return Math.max(0,(futureCost-expectedRound)*85);
}

export function scarcityScore(pool:DraftPlayer[], position:string) {
  const remaining = pool.filter((player)=>player.position===position).sort((a,b)=>b.marketValue-a.marketValue);
  if(!remaining.length) return 0;
  const first = remaining[0]?.marketValue || 0;
  const fifth = remaining[4]?.marketValue || remaining.at(-1)?.marketValue || 0;
  return Math.max(0,Math.min(100,(first-fifth)/55));
}

export function scorePlayer(params:{
  player:DraftPlayer;
  manager:DraftManager;
  roster:DraftPlayer[];
  pool:DraftPlayer[];
  round:number;
}) {
  const {player,manager,roster,pool,round}=params;
  const counts=positionCounts(roster);
  const target=rosterTargets[player.position] ?? 0;
  const needGap=Math.max(0,target-(counts[player.position]||0));
  const needBonus=needGap*260*manager.tendencies.needWeight;
  const qbBonus=player.position==="QB"
    ? (round<=6?900:420)*manager.tendencies.qbAggression
    : 0;
  const youthBonus=player.age
    ? Math.max(0,29-player.age)*26*manager.tendencies.youth
    : 0;
  const keeperBonus=keeperAdjustedValue(player,round)*manager.tendencies.keeperFocus;
  const scarcity=scarcityScore(pool,player.position)*7;
  const riskNoise=(Math.random()-.5)*180*manager.tendencies.risk;

  return okflAdjustedMarketValue(player) + needBonus + qbBonus + youthBonus + keeperBonus + scarcity + riskNoise;
}

export function explainPick(params:{
  player:DraftPlayer;
  manager:DraftManager;
  roster:DraftPlayer[];
  pool:DraftPlayer[];
  round:number;
}) {
  const {player,manager,roster,pool,round}=params;
  const notes:string[]=[];
  const counts=positionCounts(roster);
  if(player.position==="QB" && round<=6) notes.push("2QB scarcity pushed quarterback value upward.");
  if((counts[player.position]||0)===0) notes.push(`Fills the roster's first ${player.position} slot.`);
  const keeper=keeperAdjustedValue(player,round);
  if(keeper>=250) notes.push(`Strong future keeper surplus from a Round ${round} draft cost.`);
  const scarcity=scarcityScore(pool,player.position);
  if(scarcity>=35) notes.push(`${player.position} tier drop-off is approaching.`);
  if(player.age && player.age<=24) notes.push("Youth and future-value profile fit this manager.");
  if(!notes.length) notes.push("Best blend of market value and roster construction.");
  return notes;
}

export function defaultFallbackPool():DraftPlayer[] {
  const rows = [
    ["Josh Allen","QB","BUF",10000,1,30],["Lamar Jackson","QB","BAL",9700,2,29],
    ["Jayden Daniels","QB","WAS",9500,3,25],["Jalen Hurts","QB","PHI",9200,4,27],
    ["Joe Burrow","QB","CIN",9000,5,29],["Patrick Mahomes","QB","KC",8750,6,30],
    ["Bijan Robinson","RB","ATL",8600,7,24],["Ja'Marr Chase","WR","CIN",8500,8,26],
    ["Justin Jefferson","WR","MIN",8350,9,27],["CeeDee Lamb","WR","DAL",8100,10,27],
    ["Jahmyr Gibbs","RB","DET",8000,11,24],["Amon-Ra St. Brown","WR","DET",7750,12,26],
    ["Nico Collins","WR","HOU",7350,13,27],["Breece Hall","RB","NYJ",7200,14,25],
    ["Garrett Wilson","WR","NYJ",7000,15,26],["Caleb Williams","QB","CHI",6900,16,24],
    ["Bo Nix","QB","DEN",6800,17,26],["Jordan Love","QB","GB",6650,18,27],
    ["Baker Mayfield","QB","TB",6500,19,31],["Brock Purdy","QB","SF",6425,20,26],
    ["Kyler Murray","QB","ARI",6300,21,29],["C.J. Stroud","QB","HOU",6200,22,24],
    ["Dak Prescott","QB","DAL",6050,23,33],["Justin Herbert","QB","LAC",5950,24,28],
    ["Marvin Harrison Jr.","WR","ARI",5825,25,24],["Brian Thomas Jr.","WR","JAX",5750,26,23],
    ["A.J. Brown","WR","PHI",5600,27,29],["Saquon Barkley","RB","PHI",5500,28,29],
    ["Omarion Hampton","RB","LAC",5400,29,23],["TreVeyon Henderson","RB","NE",5300,30,23],
    ["Ashton Jeanty","RB","LV",5200,31,22],["Tee Higgins","WR","CIN",5100,32,27],
    ["George Kittle","TE","SF",5000,33,32],["Sam LaPorta","TE","DET",4900,34,25],
    ["Derrick Henry","RB","BAL",4800,35,32],["Davante Adams","WR","LAR",4700,36,33],
    ["Josh Jacobs","RB","GB",4600,37,28],["Terry McLaurin","WR","WAS",4500,38,31],
    ["DK Metcalf","WR","PIT",4400,39,28],["Mike Evans","WR","TB",4300,40,33],
    ["Zay Flowers","WR","BAL",4200,41,25],["DJ Moore","WR","CHI",4100,42,29],
    ["DeVonta Smith","WR","PHI",4000,43,27],["Alvin Kamara","RB","NO",3900,44,31],
    ["James Conner","RB","ARI",3800,45,31],["Tony Pollard","RB","TEN",3700,46,29],
    ["Mark Andrews","TE","BAL",3600,47,31],["Kyle Pitts","TE","ATL",3500,48,25],
    ["David Montgomery","RB","DET",3400,49,29],["Rhamondre Stevenson","RB","NE",3300,50,28],
    ["Jaylen Warren","RB","PIT",3200,51,27],["Courtland Sutton","WR","DEN",3100,52,31],
    ["Jordan Addison","WR","MIN",3000,53,24],["Xavier Worthy","WR","KC",2925,54,23],
    ["Romeo Doubs","WR","GB",2850,55,26],["Ricky Pearsall","WR","SF",2775,56,25],
    ["Jake Ferguson","TE","DAL",2700,57,27],["T.J. Hockenson","TE","MIN",2625,58,29],
    ["Aaron Jones","RB","MIN",2550,59,31],["Najee Harris","RB","LAC",2475,60,28],
  ];
  return rows.map((row,index)=>({
    name:String(row[0]),position:String(row[1]),team:String(row[2]),
    marketValue:Number(row[3]),rank:Number(row[4]),pprRank:Number(row[4]),age:Number(row[5]),
    keeperEligible:true,source:"fallback"
  }));
}
