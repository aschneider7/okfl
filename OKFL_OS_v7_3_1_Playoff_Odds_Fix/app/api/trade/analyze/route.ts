import {NextResponse} from "next/server";
import {fallbackPprPool} from "@/lib/draftSimulator";
import {analyzeFutureTrade, type AnalyzerAsset, type MarketPlayer, type TradeContext} from "@/lib/futureTradeAnalyzer";

export const runtime = "nodejs";
export const revalidate = 21600;

const VALUES_URL = "https://raw.githubusercontent.com/dynastyprocess/data/master/files/values-players.csv";
const DEFAULT_CONTEXT: TradeContext = {window: "balanced", needs: []};

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function parseCsv(text: string) {
  const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]; const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false; else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

async function loadMarketPlayers() {
  try {
    const response = await fetch(VALUES_URL, {next: {revalidate: 21600}, signal: AbortSignal.timeout(5000), headers: {"User-Agent": "OKFL-OS/3.2"}});
    if (!response.ok) throw new Error(`Market data returned ${response.status}.`);
    const rows = parseCsv(await response.text()); const headers = rows[0];
    const index = Object.fromEntries(headers.map((header, position) => [header, position]));
    const players = rows.slice(1).map((row): MarketPlayer => ({
      player: row[index.player], pos: row[index.pos], team: row[index.team],
      age: Number.isFinite(Number(row[index.age])) ? Number(row[index.age]) : null,
      ecrPpr: Number.isFinite(Number(row[index.ecr_1qb])) ? Number(row[index.ecr_1qb]) : null,
      valuePpr: Number(row[index.value_1qb] || 0), scrapeDate: row[index.scrape_date],
    })).filter((player) => player.player && player.valuePpr > 0);
    return {players, source: "DynastyProcess weekly market values", date: players[0]?.scrapeDate ?? null};
  } catch {
    const players = fallbackPprPool().map((player): MarketPlayer => ({
      player: player.name, pos: player.position, team: player.team, age: player.age ?? null,
      ecrPpr: player.pprRank, valuePpr: player.pprValue, scrapeDate: "OKFL fallback board",
    }));
    return {players, source: "OKFL built-in PPR board", date: null};
  }
}

function bestMatch(players: MarketPlayer[], requested: string) {
  const query = normalize(requested); const exact = players.find((player) => normalize(player.player) === query);
  if (exact) return exact;
  const ranked = players.map((player) => {
    const name = normalize(player.player); const tokenMatches = query.split(" ").filter(Boolean).filter((token) => name.includes(token)).length;
    return {player, score: name.startsWith(query) ? 100 : name.includes(query) ? 80 : tokenMatches * 25};
  }).sort((a, b) => b.score - a.score)[0];
  return ranked && ranked.score >= 25 ? ranked.player : null;
}

function sanitizeAssets(value: unknown): AnalyzerAsset[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).filter((asset): asset is AnalyzerAsset => Boolean(asset && typeof asset === "object"))
    .map((asset) => ({...asset, type: asset.type === "pick" ? "pick" : "player", player: String(asset.player ?? "").slice(0, 100)}));
}

function sanitizeContext(value: unknown): TradeContext {
  const candidate = value && typeof value === "object" ? value as Partial<TradeContext> : {};
  const window = ["contending", "balanced", "retooling"].includes(String(candidate.window)) ? candidate.window as TradeContext["window"] : "balanced";
  const needs = Array.isArray(candidate.needs) ? candidate.needs.filter((need): need is string => ["QB", "RB", "WR", "TE"].includes(String(need))).slice(0, 4) : [];
  return {window, needs};
}

function resolveSide(players: MarketPlayer[], assets: AnalyzerAsset[]) {
  return assets.filter((asset) => asset.type === "pick" || asset.player.trim()).map((input) => {
    if (input.type === "pick") return {input};
    const market = bestMatch(players, input.player);
    if (!market) throw new Error(`Could not find current market data for ${input.player}.`);
    return {input, market};
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const sideAInput = sanitizeAssets(body.sideA); const sideBInput = sanitizeAssets(body.sideB);
    if (!sideAInput.length || !sideBInput.length) return NextResponse.json({error: "Add at least one asset to each side."}, {status: 400});
    const market = await loadMarketPlayers();
    const result = analyzeFutureTrade(resolveSide(market.players, sideAInput), resolveSide(market.players, sideBInput), {
      sideA: sanitizeContext(body.contextA ?? DEFAULT_CONTEXT), sideB: sanitizeContext(body.contextB ?? DEFAULT_CONTEXT),
    });
    return NextResponse.json({...result, source: market.source, sourceUrl: "https://github.com/dynastyprocess/data", marketDate: market.date, format: "Full PPR + OKFL team fit"});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : String(error)}, {status: 500});
  }
}
