
export type AnalyzerAsset = {
  player: string;
  keeperCost?: string;
  keeperYear?: string;
  keeperEligible?: boolean;
};

export type MarketPlayer = {
  player: string;
  pos: string;
  team: string;
  age: number | null;
  ecrPpr: number | null;
  valuePpr: number;
  scrapeDate: string;
};

export type EvaluatedAsset = {
  player: string;
  position: string;
  nflTeam: string;
  age: number | null;
  pprMarketValue: number;
  pprRank: number | null;
  okflRank: number | null;
  qbAdjustment: number;
  keeperBonus: number;
  total: number;
  keeperEligible: boolean;
  notes: string[];
};

export const OKFL_QB_PREMIUM_PICKS = 5;

function roundFromCost(cost?:string){
  const match=String(cost??"").match(/\d+/);
  return match?Number(match[0]):null;
}

function keeperYearNumber(value?:string){
  if(String(value).toLowerCase().includes("final"))return 3;
  const match=String(value??"").match(/\d+/);
  return match?Number(match[0]):1;
}

function okflRank(market:MarketPlayer){
  if(!market.ecrPpr)return null;
  return Math.max(1,market.ecrPpr-(market.pos==="QB"?OKFL_QB_PREMIUM_PICKS:0));
}

function keeperBonusFor(asset:AnalyzerAsset,market:MarketPlayer){
  if(asset.keeperEligible===false)return 0;
  const cost=roundFromCost(asset.keeperCost);
  const rank=okflRank(market);
  if(!cost||!rank)return 0;

  const expectedRound=Math.max(1,Math.ceil(rank/10));
  const keeperYear=keeperYearNumber(asset.keeperYear);
  const remaining=Math.max(0,4-keeperYear);
  return Math.max(-900,Math.min(2600,(cost-expectedRound)*250+remaining*175));
}

function evaluate(asset:AnalyzerAsset,market:MarketPlayer):EvaluatedAsset{
  const keeperEligible=asset.keeperEligible!==false;
  const qbAdjustment=market.pos==="QB"?500:0;
  const keeperBonus=keeperBonusFor(asset,market);
  const total=Math.max(0,market.valuePpr+qbAdjustment+keeperBonus);
  const adjustedRank=okflRank(market);

  const notes:string[]=[
    `Full-PPR market value: ${market.valuePpr.toLocaleString()}.`,
  ];
  if(market.ecrPpr)notes.push(`PPR consensus rank: ${market.ecrPpr}.`);
  if(market.pos==="QB")notes.push(`OKFL moves quarterbacks up only ${OKFL_QB_PREMIUM_PICKS} picks.`);
  if(!keeperEligible)notes.push("Not keeper-eligible; no keeper premium was added.");
  else if(!roundFromCost(asset.keeperCost))notes.push("No keeper round entered; market value only.");
  else if(keeperBonus>0)notes.push(`Keeper surplus adds ${keeperBonus.toLocaleString()} points.`);
  else if(keeperBonus<0)notes.push(`Keeper cost removes ${Math.abs(keeperBonus).toLocaleString()} points.`);

  return {
    player:market.player,
    position:market.pos,
    nflTeam:market.team,
    age:market.age,
    pprMarketValue:market.valuePpr,
    pprRank:market.ecrPpr,
    okflRank:adjustedRank,
    qbAdjustment,
    keeperBonus,
    total,
    keeperEligible,
    notes,
  };
}

function side(label:string,assets:EvaluatedAsset[]){
  return {
    label,
    assets,
    marketValue:assets.reduce((sum,asset)=>sum+asset.pprMarketValue+asset.qbAdjustment,0),
    keeperValue:assets.reduce((sum,asset)=>sum+asset.keeperBonus,0),
    total:assets.reduce((sum,asset)=>sum+asset.total,0),
  };
}

export function analyzeFutureTrade(
  sideAAssets:Array<{input:AnalyzerAsset;market:MarketPlayer}>,
  sideBAssets:Array<{input:AnalyzerAsset;market:MarketPlayer}>,
){
  const a=side("Side A",sideAAssets.map(({input,market})=>evaluate(input,market)));
  const b=side("Side B",sideBAssets.map(({input,market})=>evaluate(input,market)));
  const winner=a.total===b.total?"Even":a.total>b.total?"Side A":"Side B";
  const difference=Math.abs(a.total-b.total);
  const stronger=a.total>=b.total?a:b;
  const weaker=a.total>=b.total?b:a;
  const ratio=weaker.total>0?stronger.total/weaker.total:stronger.total>0?9:1;
  const grade=
    ratio<=1.04?"Fair":
    ratio<=1.12?"Slight Edge":
    ratio<=1.24?"Clear Win":
    ratio<=1.4?"Major Win":"Fleece";

  const reasons:string[]=[];
  if(Math.abs(a.marketValue-b.marketValue)>=650)
    reasons.push(`${a.marketValue>b.marketValue?"Side A":"Side B"} has the stronger current PPR value.`);
  if(Math.abs(a.keeperValue-b.keeperValue)>=350)
    reasons.push(`${a.keeperValue>b.keeperValue?"Side A":"Side B"} has the better keeper surplus.`);
  if(!reasons.length)reasons.push("The sides are close in both PPR market value and keeper surplus.");

  return {a,b,winner,difference,grade,reasons};
}
