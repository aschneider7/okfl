import { NextResponse } from "next/server";
import {
  analyzeFutureTrade,
  type AnalyzerAsset,
  type MarketPlayer,
} from "@/lib/futureTradeAnalyzer";

export const runtime = "nodejs";
export const revalidate = 21600;

const VALUES_URL =
  "https://raw.githubusercontent.com/dynastyprocess/data/master/files/values-players.csv";

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

async function loadMarketPlayers() {
  const response = await fetch(VALUES_URL, {
    next: { revalidate: 21600 },
    headers: { "User-Agent": "OKFL-OS/2.0.0" },
  });
  if (!response.ok) throw new Error(`Market data returned ${response.status}.`);
  const rows = parseCsv(await response.text());
  const headers = rows[0];
  const index = Object.fromEntries(headers.map((header, position) => [header, position]));

  return rows.slice(1).map((row): MarketPlayer => ({
    player: row[index.player],
    pos: row[index.pos],
    team: row[index.team],
    age: Number.isFinite(Number(row[index.age])) ? Number(row[index.age]) : null,
    ecrPpr: Number.isFinite(Number(row[index.ecr_1qb])) ? Number(row[index.ecr_1qb]) : null,
    valuePpr: Number(row[index.value_1qb] || 0),
    scrapeDate: row[index.scrape_date],
  }));
}

function bestMatch(players: MarketPlayer[], requested: string): MarketPlayer | null {
  const query = normalize(requested);
  const exact = players.find((player) => normalize(player.player) === query);
  if (exact) return exact;

  const ranked = players
    .map((player) => {
      const name = normalize(player.player);
      const tokenMatches = query
        .split(" ")
        .filter(Boolean)
        .filter((token) => name.includes(token)).length;
      const score = name.startsWith(query)
        ? 100
        : name.includes(query)
          ? 80
          : tokenMatches * 25;
      return { player, score };
    })
    .sort((a, b) => b.score - a.score)[0];

  return ranked && ranked.score >= 25 ? ranked.player : null;
}

function resolveSide(players: MarketPlayer[], assets: AnalyzerAsset[]) {
  return assets
    .filter((asset) => asset.player.trim())
    .map((input) => {
      const match = bestMatch(players, input.player);
      if (!match) {
        throw new Error(`Could not find current market data for ${input.player}.`);
      }
      return { input, market: match };
    });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sideA?: AnalyzerAsset[];
      sideB?: AnalyzerAsset[];
    };
    const marketPlayers = await loadMarketPlayers();
    const sideA = resolveSide(marketPlayers, body.sideA ?? []);
    const sideB = resolveSide(marketPlayers, body.sideB ?? []);
    if (!sideA.length || !sideB.length) {
      return NextResponse.json(
        { error: "Add at least one player to each side." },
        { status: 400 },
      );
    }

    const result = analyzeFutureTrade(sideA, sideB);
    return NextResponse.json({
      ...result,
      source: "DynastyProcess weekly market values",
      sourceUrl: "https://github.com/dynastyprocess/data",
      marketDate: sideA[0]?.market.scrapeDate || sideB[0]?.market.scrapeDate || null,
      format: "Full PPR with slight OKFL QB bump",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
