export type TradeWindow = "contending" | "balanced" | "retooling";

export type AnalyzerAsset = {
  type?: "player" | "pick";
  player: string;
  keeperCost?: string;
  keeperYear?: string;
  keeperEligible?: boolean;
  pickRound?: number;
  pickYear?: number;
};

export type TradeContext = {
  window: TradeWindow;
  needs: string[];
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

export type PreparedAsset = {input: AnalyzerAsset; market?: MarketPlayer};

export type EvaluatedAsset = {
  kind: "player" | "pick";
  player: string;
  position: string;
  nflTeam: string;
  age: number | null;
  pprMarketValue: number;
  pprRank: number | null;
  okflRank: number | null;
  qbAdjustment: number;
  keeperBonus: number;
  contextAdjustment: number;
  total: number;
  keeperEligible: boolean;
  notes: string[];
};

export const OKFL_QB_PREMIUM_PICKS = 5;
export const PICK_VALUES: Record<number, number> = {
  1: 4600, 2: 3100, 3: 2200, 4: 1650, 5: 1300, 6: 1050, 7: 850, 8: 700,
  9: 575, 10: 475, 11: 400, 12: 335, 13: 280, 14: 235, 15: 195, 16: 165, 17: 140,
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function roundFromCost(cost?: string) {
  const match = String(cost ?? "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function keeperYearNumber(value?: string) {
  if (String(value).toLowerCase().includes("final")) return 3;
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : 1;
}

function okflRank(market: MarketPlayer) {
  if (!market.ecrPpr) return null;
  return Math.max(1, market.ecrPpr - (market.pos === "QB" ? OKFL_QB_PREMIUM_PICKS : 0));
}

function keeperBonusFor(asset: AnalyzerAsset, market: MarketPlayer) {
  if (asset.keeperEligible === false) return 0;
  const cost = roundFromCost(asset.keeperCost);
  const rank = okflRank(market);
  if (!cost || !rank) return 0;
  const expectedRound = Math.max(1, Math.ceil(rank / 10));
  const remaining = Math.max(0, 4 - keeperYearNumber(asset.keeperYear));
  return clamp((cost - expectedRound) * 250 + remaining * 175, -900, 2600);
}

function playerContextAdjustment(market: MarketPlayer, context: TradeContext) {
  let adjustment = context.needs.includes(market.pos) ? Math.round(market.valuePpr * 0.07) : 0;
  if (market.age != null) {
    if (context.window === "contending" && market.age >= 27) adjustment += Math.round(market.valuePpr * 0.05);
    if (context.window === "retooling" && market.age <= 25) adjustment += Math.round(market.valuePpr * 0.09);
    if (context.window === "retooling" && market.age >= 30) adjustment -= Math.round(market.valuePpr * 0.08);
  }
  return adjustment;
}

function evaluatePlayer(asset: AnalyzerAsset, market: MarketPlayer, context: TradeContext): EvaluatedAsset {
  const keeperEligible = asset.keeperEligible !== false;
  const qbAdjustment = market.pos === "QB" ? 500 : 0;
  const keeperBonus = keeperBonusFor(asset, market);
  const contextAdjustment = playerContextAdjustment(market, context);
  const total = Math.max(0, market.valuePpr + qbAdjustment + keeperBonus + contextAdjustment);
  const notes = [`Full-PPR market value: ${market.valuePpr.toLocaleString()}.`];
  if (market.ecrPpr) notes.push(`PPR consensus rank: ${market.ecrPpr}.`);
  if (market.pos === "QB") notes.push(`OKFL moves quarterbacks up ${OKFL_QB_PREMIUM_PICKS} picks.`);
  if (!keeperEligible) notes.push("Not keeper-eligible; no keeper premium was added.");
  else if (!roundFromCost(asset.keeperCost)) notes.push("No keeper round entered; market value only.");
  else if (keeperBonus !== 0) notes.push(`Keeper value ${keeperBonus > 0 ? "adds" : "removes"} ${Math.abs(keeperBonus).toLocaleString()} points.`);
  if (contextAdjustment !== 0) notes.push(`Team fit ${contextAdjustment > 0 ? "adds" : "removes"} ${Math.abs(contextAdjustment).toLocaleString()} points.`);
  return {
    kind: "player", player: market.player, position: market.pos, nflTeam: market.team, age: market.age,
    pprMarketValue: market.valuePpr, pprRank: market.ecrPpr, okflRank: okflRank(market), qbAdjustment,
    keeperBonus, contextAdjustment, total, keeperEligible, notes,
  };
}

function evaluatePick(asset: AnalyzerAsset, context: TradeContext): EvaluatedAsset {
  const round = clamp(Number(asset.pickRound) || 1, 1, 17);
  const year = clamp(Number(asset.pickYear) || 2026, 2026, 2030);
  const discount = Math.pow(0.88, year - 2026);
  const pprMarketValue = Math.round(PICK_VALUES[round] * discount);
  const contextMultiplier = context.window === "retooling" ? 0.12 : context.window === "contending" ? -0.08 : 0;
  const contextAdjustment = Math.round(pprMarketValue * contextMultiplier);
  const label = `${year} Round ${round} pick`;
  return {
    kind: "pick", player: label, position: "PICK", nflTeam: "OKFL", age: null,
    pprMarketValue, pprRank: null, okflRank: null, qbAdjustment: 0, keeperBonus: 0,
    contextAdjustment, total: Math.max(0, pprMarketValue + contextAdjustment), keeperEligible: false,
    notes: [
      `Round ${round} baseline: ${PICK_VALUES[round].toLocaleString()} points.`,
      year > 2026 ? `Discounted ${year - 2026} season${year - 2026 === 1 ? "" : "s"} for time-to-value.` : "Available in the next OKFL draft.",
      context.window === "retooling" ? "Retooling teams receive extra value for draft capital." : context.window === "contending" ? "Contenders discount future draft capital slightly." : "Balanced team-window value applied.",
    ],
  };
}

function evaluate(asset: PreparedAsset, context: TradeContext) {
  if (asset.input.type === "pick") return evaluatePick(asset.input, context);
  if (!asset.market) throw new Error(`Missing market data for ${asset.input.player}.`);
  return evaluatePlayer(asset.input, asset.market, context);
}

function side(label: string, assets: EvaluatedAsset[], context: TradeContext) {
  return {
    label, assets, context,
    marketValue: assets.reduce((sum, asset) => sum + asset.pprMarketValue + asset.qbAdjustment, 0),
    keeperValue: assets.reduce((sum, asset) => sum + asset.keeperBonus, 0),
    contextValue: assets.reduce((sum, asset) => sum + asset.contextAdjustment, 0),
    total: assets.reduce((sum, asset) => sum + asset.total, 0),
    needMatches: assets.filter((asset) => context.needs.includes(asset.position)).map((asset) => asset.player),
  };
}

function balanceSuggestion(difference: number, strongerLabel: string) {
  if (difference < 250) return null;
  const {round, value} = Object.entries(PICK_VALUES)
    .map(([pickRound, pickValue]) => ({round: Number(pickRound), value: pickValue}))
    .sort((a, b) => Math.abs(a.value - difference) - Math.abs(b.value - difference))[0];
  return {
    targetSide: strongerLabel === "Side A" ? "Side B" : "Side A",
    round, value, label: `Add a 2026 Round ${round} pick to ${strongerLabel === "Side A" ? "Side B" : "Side A"}`,
  };
}

export function analyzeFutureTrade(
  sideAAssets: PreparedAsset[], sideBAssets: PreparedAsset[],
  contexts: {sideA: TradeContext; sideB: TradeContext},
) {
  const a = side("Side A", sideAAssets.map((asset) => evaluate(asset, contexts.sideA)), contexts.sideA);
  const b = side("Side B", sideBAssets.map((asset) => evaluate(asset, contexts.sideB)), contexts.sideB);
  const winner = a.total === b.total ? "Even" : a.total > b.total ? "Side A" : "Side B";
  const difference = Math.abs(a.total - b.total);
  const stronger = a.total >= b.total ? a : b;
  const weaker = a.total >= b.total ? b : a;
  const ratio = weaker.total > 0 ? stronger.total / weaker.total : stronger.total > 0 ? 9 : 1;
  const grade = ratio <= 1.04 ? "Fair" : ratio <= 1.12 ? "Slight Edge" : ratio <= 1.24 ? "Clear Win" : ratio <= 1.4 ? "Major Win" : "Fleece";
  const reasons: string[] = [];
  if (Math.abs(a.marketValue - b.marketValue) >= 650) reasons.push(`${a.marketValue > b.marketValue ? "Side A" : "Side B"} has the stronger current PPR value.`);
  if (Math.abs(a.keeperValue - b.keeperValue) >= 350) reasons.push(`${a.keeperValue > b.keeperValue ? "Side A" : "Side B"} has the better keeper surplus.`);
  if (a.needMatches.length || b.needMatches.length) reasons.push(`${a.needMatches.length + b.needMatches.length} incoming asset${a.needMatches.length + b.needMatches.length === 1 ? "" : "s"} directly address a selected roster need.`);
  if (!reasons.length) reasons.push("The sides are close across market value, keeper surplus, and team fit.");
  return {a, b, winner, difference, grade, reasons, balancer: balanceSuggestion(difference, stronger.label)};
}
