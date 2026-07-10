export type WeeklyStatRow = Record<string, string>;

export type ScoringMode = "ppr" | "half-ppr" | "standard";

export const PLAYER_ALIASES: Record<string, string> = {
  cmc: "Christian McCaffrey",
  jjettas: "Justin Jefferson",
  jj: "Justin Jefferson",
  tyreek: "Tyreek Hill",
  mahomes: "Patrick Mahomes",
  saquon: "Saquon Barkley",
  jt: "Jonathan Taylor",
  etn: "Travis Etienne",
  jsn: "Jaxon Smith-Njigba",
  btj: "Brian Thomas Jr.",
};

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveAlias(name: string): string {
  return PLAYER_ALIASES[normalize(name)] ?? name.trim();
}

export function parseCsv(text: string): WeeklyStatRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...body] = rows;
  if (!headers) return [];

  return body.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), values[index] ?? ""])),
  );
}

function number(row: WeeklyStatRow, ...keys: string[]): number {
  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

export function calculateFantasyPoints(row: WeeklyStatRow, mode: ScoringMode) {
  const receptionPoints = mode === "ppr" ? 1 : mode === "half-ppr" ? 0.5 : 0;

  const passingYards = number(row, "passing_yards");
  const passingTds = number(row, "passing_tds", "passing_td");
  const interceptions = number(row, "interceptions", "passing_interceptions");
  const rushingYards = number(row, "rushing_yards");
  const rushingTds = number(row, "rushing_tds", "rushing_td");
  const receptions = number(row, "receptions");
  const receivingYards = number(row, "receiving_yards");
  const receivingTds = number(row, "receiving_tds", "receiving_td");
  const returnTds = number(row, "special_teams_tds", "return_tds");
  const twoPoint =
    number(row, "passing_2pt_conversions") +
    number(row, "rushing_2pt_conversions") +
    number(row, "receiving_2pt_conversions");
  const fumblesLost = number(
    row,
    "rushing_fumbles_lost",
  ) + number(row, "receiving_fumbles_lost") + number(row, "sack_fumbles_lost");

  const total =
    passingYards * 0.04 +
    passingTds * 4 -
    interceptions * 2 +
    rushingYards * 0.1 +
    rushingTds * 6 +
    receptions * receptionPoints +
    receivingYards * 0.1 +
    receivingTds * 6 +
    returnTds * 6 +
    twoPoint * 2 -
    fumblesLost * 2;

  return {
    total: Math.round(total * 100) / 100,
    passingYards,
    passingTds,
    interceptions,
    rushingYards,
    rushingTds,
    receptions,
    receivingYards,
    receivingTds,
    returnTds,
    twoPoint,
    fumblesLost,
  };
}

export function displayName(row: WeeklyStatRow): string {
  return (
    row.player_display_name ||
    row.player_name ||
    row.player ||
    row.name ||
    "Unknown player"
  );
}

export function findBestPlayerMatch(rows: WeeklyStatRow[], requestedName: string): WeeklyStatRow | null {
  const target = normalize(resolveAlias(requestedName));
  const exact = rows.find((row) => normalize(displayName(row)) === target);
  if (exact) return exact;

  const targetTokens = target.split(" ").filter(Boolean);
  const scored = rows
    .map((row) => {
      const candidate = normalize(displayName(row));
      const candidateTokens = candidate.split(" ").filter(Boolean);
      const overlap = targetTokens.filter((token) => candidateTokens.includes(token)).length;
      const contains = candidate.includes(target) || target.includes(candidate) ? 3 : 0;
      return { row, score: overlap * 2 + contains - Math.abs(candidate.length - target.length) / 100 };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.score >= Math.max(2, targetTokens.length * 1.5) ? scored[0].row : null;
}
