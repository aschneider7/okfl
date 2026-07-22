export type HistoricalDraftPlayer = {
  name: string;
  position: string;
  pprRank: number;
  marketAdp?: number;
  okflRank?: number;
};

// Median overall slots of the first 20 non-keeper QBs selected in the
// 2023-2025 OKFL drafts. This intentionally is not a generic 2QB board.
export const OKFL_QB_DRAFT_CURVE = [8,10,18,21,25,37,41,42,43,47,55,56,60,70,71,77,80,89,94,95] as const;
export const OKFL_QB_HISTORY_LABEL = "2023-25 OKFL draft curve";

// These quarterbacks are removed before the historical curve is applied.
export const CURRENT_PROJECTED_QB_KEEPERS = ["Jaxson Dart","Drake Maye","Trevor Lawrence","Daniel Jones","Sam Darnold"] as const;

export function draftHistoryPlayerKey(name:string){
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b/g,"").replace(/[^a-z0-9]/g,"");
}

export function applyOkflHistoricalQuarterbackCurve<T extends HistoricalDraftPlayer>(players:T[],keeperNames:readonly string[]=CURRENT_PROJECTED_QB_KEEPERS){
  const keeperKeys=new Set(keeperNames.map(draftHistoryPlayerKey));
  const quarterbacks=players
    .filter((player)=>player.position==="QB"&&!keeperKeys.has(draftHistoryPlayerKey(player.name)))
    .sort((a,b)=>(a.marketAdp??a.pprRank)-(b.marketAdp??b.pprRank));
  const lastCurvePick=OKFL_QB_DRAFT_CURVE[OKFL_QB_DRAFT_CURVE.length-1];
  const modeled=new Map(quarterbacks.map((player,index)=>[
    draftHistoryPlayerKey(player.name),
    OKFL_QB_DRAFT_CURVE[index]??lastCurvePick+(index-OKFL_QB_DRAFT_CURVE.length+1)*8,
  ]));
  return players.map((player)=>player.position==="QB"&&modeled.has(draftHistoryPlayerKey(player.name))
    ? {...player,okflRank:modeled.get(draftHistoryPlayerKey(player.name))}
    : player);
}
