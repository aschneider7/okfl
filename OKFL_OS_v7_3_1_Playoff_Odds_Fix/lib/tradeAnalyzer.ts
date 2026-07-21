
export type AnalyzerAsset = {
  player: string;
  keeperCost?: string;
  keeperYear?: string;
  keeperEligible?: boolean;
};

type MarketPlayer = {
  name: string;
  position: string;
  team: string;
  rank: number;
  value: number;
  age?: number | null;
};

export const OKFL_QB_PREMIUM_ROUNDS = 0.40;

function roundFromCost(cost?: string) {
  const match = String(cost ?? "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function keeperYearsRemaining(value?: string) {
  if (String(value).toLowerCase().includes("final")) return 0;
  const match = String(value ?? "").match(/\d+/);
  const year = match ? Number(match[0]) : 1;
  return Math.max(0, 3 - year);
}

function pprValueFromRank(rank:number) {
  return Math.max(200, 10000 - (rank - 1) * 105);
}

function adjustedFutureValue(player:MarketPlayer) {
  const base = player.value || pprValueFromRank(player.rank);
  const qbBonus = player.position === "QB" ? Math.round(OKFL_QB_PREMIUM_ROUNDS * 10) * 55 : 0;
  const ageBonus =
    player.age == null ? 0 :
    player.position === "RB" ? Math.max(-900, (26 - player.age) * 120) :
    player.position === "WR" ? Math.max(-700, (28 - player.age) * 95) :
    player.position === "QB" ? Math.max(-500, (32 - player.age) * 65) :
    Math.max(-600, (29 - player.age) * 80);
  return Math.max(0, base + qbBonus + ageBonus);
}

export function analyzeFutureTrade(
  marketPlayers:MarketPlayer[],
  sideA:AnalyzerAsset[],
  sideB:AnalyzerAsset[],
) {
  const byName = new Map(marketPlayers.map((player)=>[player.name.toLowerCase(),player]));
  const evalSide = (label:string, assets:AnalyzerAsset[]) => {
    const rows = assets.filter((asset)=>asset.player.trim()).map((asset)=>{
      const player = byName.get(asset.player.toLowerCase());
      if(!player) return {
        player:asset.player,position:"—",team:"—",market:0,keeper:0,total:0,
        notes:["Player not found in the current rankings."]
      };
      const market = adjustedFutureValue(player);
      const eligible = asset.keeperEligible !== false;
      const round = eligible ? roundFromCost(asset.keeperCost) : null;
      const years = eligible ? keeperYearsRemaining(asset.keeperYear) : 0;
      const projectedRound = Math.max(1,Math.ceil(player.rank/10));
      const keeper = eligible && round
        ? Math.max(-900, (round - projectedRound) * 180 + years * 240)
        : 0;
      const total = Math.max(0, market + keeper);
      const notes = [
        `Full-PPR rank: ${player.rank}.`,
        player.position==="QB"
          ? `QB moved up by about ${OKFL_QB_PREMIUM_ROUNDS.toFixed(1)} rounds for OKFL.`
          : "Uses full-PPR market value.",
        eligible ? (round ? `Keeper adjustment based on a Round ${round} cost.` : "No keeper cost entered.") : "Not keeper-eligible."
      ];
      return {
        player:player.name,position:player.position,team:player.team,
        market:Math.round(market),keeper:Math.round(keeper),total:Math.round(total),notes
      };
    });
    return {
      label,assets:rows,
      market:rows.reduce((sum,row)=>sum+row.market,0),
      keeper:rows.reduce((sum,row)=>sum+row.keeper,0),
      total:rows.reduce((sum,row)=>sum+row.total,0),
    };
  };
  const a=evalSide("Side A",sideA);
  const b=evalSide("Side B",sideB);
  const winner=a.total===b.total?"Even":a.total>b.total?"Side A":"Side B";
  const diff=Math.abs(a.total-b.total);
  const ratio=Math.max(a.total,b.total)/Math.max(1,Math.min(a.total,b.total));
  const grade=ratio<=1.05?"Fair":ratio<=1.15?"Slight Edge":ratio<=1.28?"Clear Win":ratio<=1.45?"Major Win":"Fleece";
  return {a,b,winner,difference:diff,grade};
}
