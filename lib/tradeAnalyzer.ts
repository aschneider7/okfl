
type AnyData = any;

export type AnalyzerAsset = {
  player: string;
  keeperCost?: string;
  keeperYear?: string;
  keeperEligible?: boolean;
};

export type EvaluatedAsset = {
  player: string;
  position: string;
  nflTeam: string;
  currentImpact: number;
  keeperValue: number;
  historicalValue: number;
  championshipValue: number;
  total: number;
  notes: string[];
};

function norm(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function positionMultiplier(position: string) {
  const map: Record<string, number> = {
    QB: 1.12,
    RB: 1.06,
    WR: 1,
    TE: 1.08,
    K: 0.35,
    DEF: 0.35,
  };
  return map[position] ?? 0.85;
}

function findPlayer(data: AnyData, name: string) {
  const clean = norm(name);
  const exact = data.players.find((player: any) => norm(player.name) === clean);
  if (exact) return exact;

  return [...data.players]
    .map((player: any) => ({
      player,
      score:
        norm(player.name).startsWith(clean) ? 95 :
        norm(player.name).includes(clean) ? 75 :
        clean.split(" ").filter(Boolean).filter((token) => norm(player.name).includes(token)).length * 25,
    }))
    .sort((a: any, b: any) => b.score - a.score)[0]?.player;
}

function recentImpact(player: any) {
  const rows = [...(player?.season_stats ?? [])]
    .sort((a: any, b: any) => Number(b.season) - Number(a.season))
    .slice(0, 3);
  const weights = [1, 0.55, 0.25];

  return rows.reduce(
    (sum: number, row: any, index: number) =>
      sum +
      Number(row.points ?? 0) * weights[index] * 0.34 +
      Number(row.starts ?? 0) * weights[index] * 1.1,
    0,
  );
}

export function evaluateAsset(data: AnyData, asset: AnalyzerAsset): EvaluatedAsset {
  const player = findPlayer(data, asset.player);

  if (!player) {
    return {
      player: asset.player,
      position: "—",
      nflTeam: "—",
      currentImpact: 0,
      keeperValue: 0,
      historicalValue: 0,
      championshipValue: 0,
      total: 0,
      notes: ["Player was not found in the OKFL database."],
    };
  }

  const position = player.positions?.[0] ?? "—";
  const nflTeam = player.nfl_teams?.at(-1) ?? "—";
  const currentImpact = Math.min(
    150,
    Math.max(5, recentImpact(player) * positionMultiplier(position)),
  );

  const keeperEligible = asset.keeperEligible !== false;
  const round = keeperEligible ? roundFromCost(asset.keeperCost) : null;
  const keeperYear = keeperEligible ? keeperYearNumber(asset.keeperYear) : 3;
  const keeperValue = keeperEligible
    ? Math.min(
        120,
        (round ? Math.max(0, 15 - round) * 6.5 : 0) +
          Math.max(0, 4 - keeperYear) * 14,
      )
    : 0;

  const trackedPoints = (player.season_stats ?? []).reduce(
    (sum: number, row: any) => sum + Number(row.points ?? 0),
    0,
  );
  const seasons = new Set(
    (player.season_stats ?? []).map((row: any) => Number(row.season)),
  ).size;
  const historicalValue = Math.min(
    80,
    seasons * 8 + Math.log10(Math.max(1, trackedPoints)) * 11,
  );

  const championshipValue = Math.min(
    50,
    Number(player.championships ?? 0) * 18 +
      Number(player.championship_starter_seasons?.length ?? 0) * 7,
  );

  const total =
    currentImpact * 0.5 +
    keeperValue * 0.3 +
    historicalValue * 0.13 +
    championshipValue * 0.07;

  const notes: string[] = [];
  if (currentImpact >= 95) notes.push("Elite current fantasy impact.");
  else if (currentImpact >= 70) notes.push("Strong current starter value.");
  else if (currentImpact >= 45) notes.push("Useful current contributor.");
  else notes.push("Limited recent tracked impact.");

  if (!keeperEligible) notes.push("Not keeper-eligible; no keeper value was added.");
  else if (keeperValue >= 75) notes.push("Premium keeper surplus.");
  else if (keeperValue >= 45) notes.push("Meaningful keeper value.");
  else if (round) notes.push("Expensive keeper cost relative to the model.");
  else notes.push("No keeper cost entered.");

  if (seasons >= 3) notes.push("Established OKFL track record.");
  if (player.championships) notes.push(`${player.championships} championship roster credit.`);

  return {
    player: player.name,
    position,
    nflTeam,
    currentImpact: Math.round(currentImpact * 10) / 10,
    keeperValue: Math.round(keeperValue * 10) / 10,
    historicalValue: Math.round(historicalValue * 10) / 10,
    championshipValue: Math.round(championshipValue * 10) / 10,
    total: Math.round(total * 10) / 10,
    notes,
  };
}

function evaluateSide(data: AnyData, label: string, assets: AnalyzerAsset[]) {
  const evaluated = assets
    .filter((asset) => asset.player.trim())
    .map((asset) => evaluateAsset(data, asset));

  return {
    label,
    assets: evaluated,
    total: Math.round(evaluated.reduce((sum, asset) => sum + asset.total, 0) * 10) / 10,
    currentImpact: Math.round(evaluated.reduce((sum, asset) => sum + asset.currentImpact, 0) * 10) / 10,
    keeperValue: Math.round(evaluated.reduce((sum, asset) => sum + asset.keeperValue, 0) * 10) / 10,
    historicalValue: Math.round(evaluated.reduce((sum, asset) => sum + asset.historicalValue, 0) * 10) / 10,
    championshipValue: Math.round(evaluated.reduce((sum, asset) => sum + asset.championshipValue, 0) * 10) / 10,
  };
}

export function analyzeTrade(data: AnyData, sideA: AnalyzerAsset[], sideB: AnalyzerAsset[]) {
  const a = evaluateSide(data, "Side A", sideA);
  const b = evaluateSide(data, "Side B", sideB);
  const winner = a.total === b.total ? "Even" : a.total > b.total ? "Side A" : "Side B";
  const difference = Math.round(Math.abs(a.total - b.total) * 10) / 10;
  const stronger = a.total >= b.total ? a : b;
  const weaker = a.total >= b.total ? b : a;
  const ratio = weaker.total ? stronger.total / weaker.total : stronger.total ? 9 : 1;

  const grade =
    ratio <= 1.05 ? "Fair" :
    ratio <= 1.15 ? "Slight Edge" :
    ratio <= 1.28 ? "Clear Win" :
    ratio <= 1.45 ? "Major Win" :
    "Fleece";

  const reasons: string[] = [];
  if (Math.abs(a.currentImpact - b.currentImpact) >= 20)
    reasons.push(`${a.currentImpact > b.currentImpact ? "Side A" : "Side B"} has the stronger current fantasy impact.`);
  if (Math.abs(a.keeperValue - b.keeperValue) >= 18)
    reasons.push(`${a.keeperValue > b.keeperValue ? "Side A" : "Side B"} has the better keeper-cost profile.`);
  if (Math.abs(a.historicalValue - b.historicalValue) >= 15)
    reasons.push(`${a.historicalValue > b.historicalValue ? "Side A" : "Side B"} has the stronger OKFL history.`);
  if (!reasons.length) reasons.push("The sides are close across current impact and keeper value.");

  return { a, b, winner, difference, grade, reasons };
}
