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
  ecr2qb: number | null;
  value2qb: number;
  scrapeDate: string;
};

export type EvaluatedAsset = {
  player: string;
  position: string;
  nflTeam: string;
  age: number | null;
  marketValue: number;
  marketRank: number | null;
  keeperBonus: number;
  total: number;
  keeperEligible: boolean;
  notes: string[];
};

function roundFromCost(cost?: string) {
  const match = String(cost ?? "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function keeperYearNumber(value?: string) {
  if (String(value).toLowerCase().includes("final")) return 3;
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : 1;
}

function expectedRound(ecr2qb: number | null) {
  if (!ecr2qb || ecr2qb <= 0) return null;
  return Math.max(1, Math.ceil(ecr2qb / 10));
}

function keeperBonusFor(asset: AnalyzerAsset, market: MarketPlayer) {
  if (asset.keeperEligible === false) return 0;
  const costRound = roundFromCost(asset.keeperCost);
  const projectedRound = expectedRound(market.ecr2qb);
  const keeperYear = keeperYearNumber(asset.keeperYear);
  if (!costRound || !projectedRound) return 0;

  const roundSurplus = Math.max(-4, costRound - projectedRound);
  const remainingWindow = Math.max(0, 4 - keeperYear);
  const raw = roundSurplus * 260 + remainingWindow * 180;
  return Math.max(-900, Math.min(2600, raw));
}

function evaluateAsset(asset: AnalyzerAsset, market: MarketPlayer): EvaluatedAsset {
  const keeperEligible = asset.keeperEligible !== false;
  const keeperBonus = keeperBonusFor(asset, market);
  const total = Math.max(0, market.value2qb + keeperBonus);
  const notes: string[] = [];

  notes.push(`Current 2QB market value: ${market.value2qb.toLocaleString()}.`);
  if (market.ecr2qb) notes.push(`Current 2QB consensus rank: ${market.ecr2qb}.`);
  if (market.age) notes.push(`Age ${market.age.toFixed(1)} is already reflected in the market value.`);

  if (!keeperEligible) {
    notes.push("Not keeper-eligible, so no keeper premium was added.");
  } else if (!roundFromCost(asset.keeperCost)) {
    notes.push("No keeper round entered, so the model used market value only.");
  } else if (keeperBonus > 0) {
    notes.push(`Keeper surplus adds ${keeperBonus.toLocaleString()} value points.`);
  } else if (keeperBonus < 0) {
    notes.push(`Keeper cost reduces value by ${Math.abs(keeperBonus).toLocaleString()} points.`);
  } else {
    notes.push("Keeper cost is close to the player's expected market round.");
  }

  return {
    player: market.player,
    position: market.pos,
    nflTeam: market.team,
    age: market.age,
    marketValue: market.value2qb,
    marketRank: market.ecr2qb,
    keeperBonus,
    total,
    keeperEligible,
    notes,
  };
}

function side(label: string, assets: EvaluatedAsset[]) {
  return {
    label,
    assets,
    marketValue: assets.reduce((sum, asset) => sum + asset.marketValue, 0),
    keeperValue: assets.reduce((sum, asset) => sum + asset.keeperBonus, 0),
    total: assets.reduce((sum, asset) => sum + asset.total, 0),
  };
}

export function analyzeFutureTrade(
  sideAAssets: Array<{ input: AnalyzerAsset; market: MarketPlayer }>,
  sideBAssets: Array<{ input: AnalyzerAsset; market: MarketPlayer }>,
) {
  const a = side("Side A", sideAAssets.map(({ input, market }) => evaluateAsset(input, market)));
  const b = side("Side B", sideBAssets.map(({ input, market }) => evaluateAsset(input, market)));
  const winner = a.total === b.total ? "Even" : a.total > b.total ? "Side A" : "Side B";
  const difference = Math.abs(a.total - b.total);
  const stronger = a.total >= b.total ? a : b;
  const weaker = a.total >= b.total ? b : a;
  const ratio = weaker.total > 0 ? stronger.total / weaker.total : stronger.total > 0 ? 9 : 1;
  const grade =
    ratio <= 1.04 ? "Fair" :
    ratio <= 1.12 ? "Slight Edge" :
    ratio <= 1.24 ? "Clear Win" :
    ratio <= 1.4 ? "Major Win" :
    "Fleece";

  const reasons: string[] = [];
  if (Math.abs(a.marketValue - b.marketValue) >= 700) {
    reasons.push(`${a.marketValue > b.marketValue ? "Side A" : "Side B"} has the stronger current 2QB market value.`);
  }
  if (Math.abs(a.keeperValue - b.keeperValue) >= 350) {
    reasons.push(`${a.keeperValue > b.keeperValue ? "Side A" : "Side B"} has the better keeper-cost surplus.`);
  }
  if (!reasons.length) reasons.push("The trade is close on both market value and keeper surplus.");

  return { a, b, winner, difference, grade, reasons };
}
