export type HistoricalDraftPlayer = {
  name: string;
  position: string;
  pprRank: number;
  marketAdp?: number;
  okflRank?: number;
};

export type QbMarketTier = {
  min: number;
  max: number;
  multiplier: number;
  samples: number;
};

// Median OKFL pick / Sleeper full-PPR ADP for non-keeper quarterbacks in
// the 2023-2025 drafts, grouped by their rank among available market QBs.
// 83 valid matched selections feed this model; it is not a 2QB ranking list.
// A 2025 novelty Tom Brady selection is excluded because his market-QB rank
// was outside the active-player pool used by the model.
export const OKFL_QB_MARKET_TIERS:QbMarketTier[]=[
  {min:1,max:4,multiplier:.525,samples:12},
  {min:5,max:8,multiplier:.696,samples:12},
  {min:9,max:12,multiplier:.579,samples:12},
  {min:13,max:16,multiplier:.484,samples:12},
  {min:17,max:20,multiplier:.485,samples:12},
  {min:21,max:30,multiplier:.573,samples:19},
  {min:31,max:99,multiplier:.557,samples:4},
];
export const OKFL_QB_HISTORY_LABEL = "Sleeper PPR ADP x OKFL premium";

// These quarterbacks are removed before available-QB market tiers are assigned.
export const CURRENT_PROJECTED_QB_KEEPERS = ["Jaxson Dart","Drake Maye","Trevor Lawrence","Daniel Jones","Sam Darnold"] as const;

export function draftHistoryPlayerKey(name:string){
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b/g,"").replace(/[^a-z0-9]/g,"");
}

function tierForAvailableQb(marketRank:number){
  return OKFL_QB_MARKET_TIERS.find((tier)=>marketRank>=tier.min&&marketRank<=tier.max)??OKFL_QB_MARKET_TIERS.at(-1)!;
}

export function applyOkflHistoricalQuarterbackCurve<T extends HistoricalDraftPlayer>(players:T[],keeperNames:readonly string[]=CURRENT_PROJECTED_QB_KEEPERS){
  const keeperKeys=new Set(keeperNames.map(draftHistoryPlayerKey));
  const quarterbacks=players
    .filter((player)=>player.position==="QB"&&!keeperKeys.has(draftHistoryPlayerKey(player.name)))
    .sort((a,b)=>(a.marketAdp??a.pprRank)-(b.marketAdp??b.pprRank));
  const modeled=new Map<string,number>();
  let previousRank=0;
  quarterbacks.forEach((player,index)=>{
    const marketRank=index+1;
    const marketAdp=player.marketAdp??player.pprRank;
    const rawRank=Math.round(marketAdp*tierForAvailableQb(marketRank).multiplier);
    const okflRank=Math.max(1,previousRank+1,rawRank);
    modeled.set(draftHistoryPlayerKey(player.name),okflRank);
    previousRank=okflRank;
  });
  return players.map((player)=>player.position==="QB"&&modeled.has(draftHistoryPlayerKey(player.name))
    ? {...player,okflRank:modeled.get(draftHistoryPlayerKey(player.name))}
    : player);
}
