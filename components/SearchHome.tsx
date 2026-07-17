"use client";

import Link from "next/link";
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useData } from "./DataProvider";
import { Loading } from "./Page";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type Suggestion = {
  id: string;
  group: "Players" | "Franchises & Managers" | "Smart Questions" | "Seasons & Records" | "NFL Live";
  label: string;
  detail: string;
  query: string;
  href?: string;
  score: number;
};

type LiveNflResult = {
  player: string;
  season: number;
  week: number;
  scoring: "ppr" | "half-ppr" | "standard";
  fantasyPoints: number;
  team: string | null;
  opponent: string | null;
  position: string | null;
  stats: {
    passingYards: number;
    passingTds: number;
    interceptions: number;
    rushingYards: number;
    rushingTds: number;
    receptions: number;
    receivingYards: number;
    receivingTds: number;
    fumblesLost: number;
  };
  source: string;
  sourceUrl: string;
};

const EXTERNAL_PLAYERS = [
  ["CMC", "Christian McCaffrey"],
  ["Christian McCaffrey", "Christian McCaffrey"],
  ["Patrick Mahomes", "Patrick Mahomes"],
  ["Saquon Barkley", "Saquon Barkley"],
  ["Justin Jefferson", "Justin Jefferson"],
  ["Ja'Marr Chase", "Ja'Marr Chase"],
  ["Josh Allen", "Josh Allen"],
  ["Lamar Jackson", "Lamar Jackson"],
  ["Bijan Robinson", "Bijan Robinson"],
  ["Tyreek Hill", "Tyreek Hill"],
  ["Jonathan Taylor", "Jonathan Taylor"],
  ["Jaxon Smith-Njigba", "Jaxon Smith-Njigba"],
];

function fuzzyScore(candidateRaw: string, queryRaw: string) {
  const candidate = normalize(candidateRaw);
  const query = normalize(queryRaw);
  if (!query) return 0;
  if (candidate === query) return 100;
  if (candidate.startsWith(query)) return 86 - Math.min(15, candidate.length - query.length);
  if (candidate.includes(query)) return 68 - Math.min(15, candidate.indexOf(query));

  const queryTokens = query.split(" ").filter(Boolean);
  const candidateTokens = candidate.split(" ").filter(Boolean);
  const overlap = queryTokens.filter((token) =>
    candidateTokens.some((candidateToken) => candidateToken.startsWith(token) || token.startsWith(candidateToken)),
  ).length;

  let subsequence = 0;
  let index = 0;
  for (const char of query) {
    const found = candidate.indexOf(char, index);
    if (found >= 0) {
      subsequence += 1;
      index = found + 1;
    }
  }

  return overlap * 18 + (subsequence / Math.max(1, query.length)) * 20;
}

function franchiseByTerm(data: any, term: string) {
  const clean = normalize(term);
  return data.franchises
    .map((franchise: any) => ({
      franchise,
      score: fuzzyScore(
        `${franchise.name} ${franchise.display_name} ${franchise.current_manager} ${franchise.original_manager}`,
        clean,
      ),
    }))
    .sort((a: any, b: any) => b.score - a.score)[0]?.score >= 30
    ? data.franchises
        .map((franchise: any) => ({
          franchise,
          score: fuzzyScore(
            `${franchise.name} ${franchise.display_name} ${franchise.current_manager} ${franchise.original_manager}`,
            clean,
          ),
        }))
        .sort((a: any, b: any) => b.score - a.score)[0].franchise
    : undefined;
}

function parseLiveNflQuery(raw: string) {
  const cleaned = raw.trim();
  const patterns = [
    /^(.+?)\s+(20\d{2})\s+(?:week|wk)\s*(\d{1,2})(?:\s+(half[- ]?ppr|standard|ppr))?(?:\s+(?:fantasy\s+)?points?)?$/i,
    /^how many\s+(?:(half[- ]?ppr|standard|ppr)\s+)?(?:fantasy\s+)?points did (.+?) score (?:in )?(20\d{2})\s+(?:week|wk)\s*(\d{1,2})\??$/i,
    /^(.+?)\s+(?:week|wk)\s*(\d{1,2})\s+(20\d{2})(?:\s+(half[- ]?ppr|standard|ppr))?(?:\s+(?:fantasy\s+)?points?)?$/i,
  ];

  const first = cleaned.match(patterns[0]);
  if (first) {
    const mode = (first[4] || "ppr").toLowerCase().replace(" ", "-");
    return {
      player: first[1],
      season: Number(first[2]),
      week: Number(first[3]),
      scoring: mode === "half-ppr" ? ("half-ppr" as const) : mode === "standard" ? ("standard" as const) : ("ppr" as const),
    };
  }

  const second = cleaned.match(patterns[1]);
  if (second) {
    const mode = (second[1] || "ppr").toLowerCase().replace(" ", "-");
    return {
      player: second[2],
      season: Number(second[3]),
      week: Number(second[4]),
      scoring: mode === "half-ppr" ? ("half-ppr" as const) : mode === "standard" ? ("standard" as const) : ("ppr" as const),
    };
  }

  const third = cleaned.match(patterns[2]);
  if (third) {
    const mode = (third[4] || "ppr").toLowerCase().replace(" ", "-");
    return {
      player: third[1],
      season: Number(third[3]),
      week: Number(third[2]),
      scoring: mode === "half-ppr" ? ("half-ppr" as const) : mode === "standard" ? ("standard" as const) : ("ppr" as const),
    };
  }

  return null;
}

function statLine(result: LiveNflResult) {
  const stats = result.stats;
  const pieces: string[] = [];
  if (stats.passingYards || stats.passingTds || stats.interceptions) {
    pieces.push(`${stats.passingYards} pass yds, ${stats.passingTds} pass TD, ${stats.interceptions} INT`);
  }
  if (stats.rushingYards || stats.rushingTds) {
    pieces.push(`${stats.rushingYards} rush yds, ${stats.rushingTds} rush TD`);
  }
  if (stats.receptions || stats.receivingYards || stats.receivingTds) {
    pieces.push(`${stats.receptions} rec, ${stats.receivingYards} rec yds, ${stats.receivingTds} rec TD`);
  }
  return pieces.join(" • ") || "No scoring statistics recorded";
}

function playerSummary(player: any) {
  const points = (player.season_stats || []).reduce(
    (sum: number, row: any) => sum + Number(row.points || 0),
    0,
  );
  const owners = [
    ...new Set(
      (player.events || [])
        .map((event: any) => event.franchise)
        .filter(Boolean),
    ),
  ] as string[];
  const years = player.rostered_seasons?.length ? player.rostered_seasons : [];
  return {
    points,
    owners,
    firstYear: years.length ? Math.min(...years) : 9999,
    lastYear: years.length ? Math.max(...years) : 0,
  };
}

function buildSmartQuestionSuggestions(raw: string): Suggestion[] {
  const clean = normalize(raw);
  const suggestions: Suggestion[] = [];
  const currentYear = new Date().getFullYear();

  const weekMatch = clean.match(/(.+?)\s+(20\d{2})\s+(?:week|wk)\s*(\d{0,2})/);
  if (weekMatch) {
    const player = weekMatch[1].trim();
    const season = weekMatch[2];
    const week = weekMatch[3] || "1";
    suggestions.push({
      id: `live-${player}-${season}-${week}`,
      group: "NFL Live",
      label: `${player} • ${season} Week ${week} PPR points`,
      detail: "Fetch a live weekly fantasy score from nflverse",
      query: `${player} ${season} Week ${week} PPR points`,
      score: 96,
    });
  }

  if (/^who owned\s+/.test(clean)) {
    const player = raw.replace(/^who owned\s+/i, "").trim();
    suggestions.push({
      id: `owned-${player}`,
      group: "Smart Questions",
      label: `Who owned ${player}?`,
      detail: "Show the complete OKFL ownership timeline",
      query: `who owned ${player}`,
      score: 94,
    });
  }

  if (/^who drafted\s+/.test(clean)) {
    const player = raw.replace(/^who drafted\s+/i, "").trim();
    suggestions.push({
      id: `drafted-${player}`,
      group: "Smart Questions",
      label: `Who drafted ${player}?`,
      detail: "Find every tracked draft selection",
      query: `who drafted ${player}`,
      score: 94,
    });
  }

  if (/\svs\s|\sversus\s/.test(` ${clean} `)) {
    suggestions.push({
      id: `compare-${clean}`,
      group: "Smart Questions",
      label: raw,
      detail: "Open a franchise head-to-head comparison",
      query: raw,
      score: 98,
    });
  }

  if (/\btrade\b/.test(clean)) {
    suggestions.push({
      id: `trade-${clean}`,
      group: "Smart Questions",
      label: raw,
      detail: "Search all completed OKFL trade deals",
      query: raw,
      href: "/trades",
      score: 83,
    });
  }

  if (/\bchampionship|titles?|goat\b/.test(clean)) {
    suggestions.push({
      id: `record-${clean}`,
      group: "Seasons & Records",
      label: raw,
      detail: "Search championships and legacy records",
      query: raw,
      href: "/records",
      score: 82,
    });
  }

  const seasonMatch = clean.match(/\b(202[1-9])\b/);
  if (seasonMatch) {
    const season = Number(seasonMatch[1]);
    suggestions.push({
      id: `season-${season}`,
      group: "Seasons & Records",
      label: `${season} OKFL season`,
      detail: "Search standings, drafts, trades, keepers, and results",
      query: `${season}`,
      href: "/time-machine",
      score: 72,
    });
  }

  if (clean.length >= 2 && !/\d/.test(clean)) {
    for (const [alias, fullName] of EXTERNAL_PLAYERS) {
      const score = Math.max(fuzzyScore(alias, clean), fuzzyScore(fullName, clean));
      if (score >= 36) {
        suggestions.push({
          id: `external-${fullName}`,
          group: "NFL Live",
          label: fullName,
          detail: `Try: ${fullName} ${Math.min(currentYear, 2025)} Week 1 PPR points`,
          query: `${fullName} ${Math.min(currentYear, 2025)} Week 1 PPR points`,
          score: score - 2,
        });
      }
    }
  }

  return suggestions;
}

export function SearchHome() {
  const { data, error } = useData();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [focused, setFocused] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [liveResult, setLiveResult] = useState<LiveNflResult | null>(null);
  const [liveError, setLiveError] = useState("");
  const [liveLoading, setLiveLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const liveIntent = useMemo(() => parseLiveNflQuery(query), [query]);

  const predictiveSuggestions = useMemo(() => {
    if (!data || normalize(query).length < 2) return [] as Suggestion[];

    const clean = normalize(query);
    const suggestions: Suggestion[] = [];

    for (const player of data.players) {
      const score = fuzzyScore(player.name, clean);
      if (score >= 31) {
        const summary = playerSummary(player);
        suggestions.push({
          id: `player-${player.name}`,
          group: "Players",
          label: player.name,
          detail: `${(player.positions || []).join("/") || "Player"} • ${summary.owners.length} OKFL owner${summary.owners.length === 1 ? "" : "s"} • ${summary.points.toFixed(1)} points`,
          query: player.name,
          score,
        });
      }
    }

    for (const franchise of data.franchises) {
      const candidate = `${franchise.name} ${franchise.display_name} ${franchise.current_manager} ${franchise.original_manager}`;
      const score = fuzzyScore(candidate, clean);
      if (score >= 31) {
        suggestions.push({
          id: `franchise-${franchise.id}`,
          group: "Franchises & Managers",
          label: franchise.display_name,
          detail: `Current manager: ${franchise.current_manager}`,
          query: franchise.name,
          href: `/franchises/${franchise.id}`,
          score,
        });
      }
    }

    suggestions.push(...buildSmartQuestionSuggestions(query));

    const unique = new Map<string, Suggestion>();
    for (const suggestion of suggestions) {
      const current = unique.get(suggestion.id);
      if (!current || suggestion.score > current.score) unique.set(suggestion.id, suggestion);
    }

    return [...unique.values()]
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, 12);
  }, [data, query]);

  useEffect(() => {
    setActiveSuggestion(-1);
  }, [query]);

  useEffect(() => {
    if (!liveIntent) {
      setLiveResult(null);
      setLiveError("");
      setLiveLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLiveLoading(true);
      setLiveError("");
      try {
        const params = new URLSearchParams({
          player: liveIntent.player,
          season: String(liveIntent.season),
          week: String(liveIntent.week),
          scoring: liveIntent.scoring,
        });
        const response = await fetch(`/api/nfl/player-week?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Live NFL lookup failed.");
        setLiveResult(payload);
      } catch (lookupError) {
        if (controller.signal.aborted) return;
        setLiveResult(null);
        setLiveError(lookupError instanceof Error ? lookupError.message : String(lookupError));
      } finally {
        if (!controller.signal.aborted) setLiveLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [liveIntent]);

  const search = useMemo(() => {
    if (!data || !query.trim()) return { heading: "", results: [] as any[] };

    const raw = query.trim();
    const term = normalize(raw);
    const results: any[] = [];

    const versus = raw.split(/\s+(?:vs\.?|versus)\s+/i);
    if (versus.length === 2) {
      const left = franchiseByTerm(data, versus[0]);
      const right = franchiseByTerm(data, versus[1]);
      if (left && right && left.id !== right.id) {
        const games = data.weekly_games.filter(
          (game: any) => game.franchise_id === left.id && game.opponent_id === right.id,
        );
        const wins = games.filter((game: any) => game.result === "W").length;
        const losses = games.filter((game: any) => game.result === "L").length;
        const ties = games.filter((game: any) => game.result === "T").length;
        const playoffs = games.filter((game: any) => game.playoff);
        results.push({
          year: games.length ? Math.min(...games.map((game: any) => game.season)) : 2021,
          type: "Head-to-head",
          title: `${left.name} vs ${right.name}`,
          detail: `${left.name} is ${wins}-${losses}${ties ? `-${ties}` : ""} against ${right.name}. ${playoffs.length} tracked playoff meeting${playoffs.length === 1 ? "" : "s"}.`,
          href: `/compare?a=${left.id}&b=${right.id}`,
          stats: [
            ["Meetings", games.length],
            [`${left.name} wins`, wins],
            [`${right.name} wins`, losses],
            ["Playoff games", playoffs.length],
          ],
        });
      }
    }

    const ownedMatch = raw.match(/^who owned\s+(.+?)[?]?$/i);
    if (ownedMatch) {
      const requested = normalize(ownedMatch[1]);
      const player = [...data.players]
        .map((row: any) => ({ row, score: fuzzyScore(row.name, requested) }))
        .sort((a: any, b: any) => b.score - a.score)[0];
      if (player?.score >= 28) {
        const events = [...(player.row.events || [])]
          .filter((event: any) => event.franchise)
          .sort((a: any, b: any) => (a.season || 0) - (b.season || 0) || (a.week || 0) - (b.week || 0));
        const owners = [...new Set(events.map((event: any) => `${event.season}: ${event.franchise}`))];
        results.push({
          year: events[0]?.season || 9999,
          type: "Ownership",
          title: `${player.row.name} ownership history`,
          detail: owners.join(" → ") || "No ownership events found.",
          expanded: [
            ["Owners", new Set(events.map((event: any) => event.franchise)).size],
            ["Transactions", events.length],
            ["Trades", (player.row.trades || []).length],
            ["Championships", player.row.championships || 0],
          ],
        });
      }
    }

    const draftedMatch = raw.match(/^who drafted\s+(.+?)[?]?$/i);
    if (draftedMatch) {
      const requested = normalize(draftedMatch[1]);
      data.draft_picks
        .filter((pick: any) => fuzzyScore(pick.player, requested) >= 38)
        .slice(0, 15)
        .forEach((pick: any) =>
          results.push({
            year: pick.season,
            type: "Draft",
            title: `${pick.player} was drafted by ${pick.franchise}`,
            detail: `${pick.season} Round ${pick.round_num}, overall pick ${pick.overall_num}.`,
            href: `/drafts?year=${pick.season}`,
          }),
        );
    }

    if (/most championships|championship leaders|titles|goat/.test(term)) {
      const leaders = [...data.franchise_metrics]
        .sort(
          (a: any, b: any) =>
            b.championships - a.championships || b.legacy_score - a.legacy_score,
        )
        .slice(0, 5);
      results.push({
        year: 2021,
        type: "Record",
        title: "Championship leaders",
        detail: leaders
          .map((row: any, index: number) => `${index + 1}. ${row.franchise} — ${row.championships}`)
          .join(" • "),
        href: "/records",
      });
    }

    if (/highest score|biggest score|single week/.test(term)) {
      const top = [...data.weekly_games].sort(
        (a: any, b: any) => Number(b.score) - Number(a.score),
      )[0];
      if (top) {
        results.push({
          year: top.season,
          type: "Record",
          title: `Highest tracked weekly score: ${Number(top.score).toFixed(2)}`,
          detail: `${top.franchise} vs ${top.opponent}, Week ${top.week} of ${top.season}.`,
          href: "/records",
        });
      }
    }

    if (/biggest blowout|largest win|largest margin/.test(term)) {
      const top = [...data.weekly_games].sort(
        (a: any, b: any) => Number(b.margin || 0) - Number(a.margin || 0),
      )[0];
      if (top) {
        results.push({
          year: top.season,
          type: "Record",
          title: `Biggest tracked win: ${Number(top.margin).toFixed(2)} points`,
          detail: `${top.franchise} over ${top.opponent}, Week ${top.week} of ${top.season}.`,
          href: "/records",
        });
      }
    }

    data.players
      .map((player: any) => ({ player, score: fuzzyScore(player.name, term) }))
      .filter((entry: any) => entry.score >= 31)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 12)
      .forEach(({ player }: any) => {
        const summary = playerSummary(player);
        const keeperCount = (player.events || []).filter(
          (event: any) => event.type === "Keeper",
        ).length;
        results.push({
          year: summary.firstYear,
          type: "Player",
          title: player.name,
          detail: `${(player.positions || []).join("/") || "Position unavailable"} • ${summary.points.toFixed(1)} tracked OKFL points • ${summary.owners.length} owner${summary.owners.length === 1 ? "" : "s"}`,
          expanded: [
            ["OKFL seasons", summary.firstYear === 9999 ? "—" : `${summary.firstYear}–${summary.lastYear}`],
            ["Championships", player.championships || 0],
            ["Keeper events", keeperCount],
            ["Trades", (player.trades || []).length],
          ],
          owners: summary.owners,
        });
      });

    data.franchises
      .map((franchise: any) => ({
        franchise,
        score: fuzzyScore(
          `${franchise.name} ${franchise.display_name} ${franchise.current_manager} ${franchise.original_manager}`,
          term,
        ),
      }))
      .filter((entry: any) => entry.score >= 31)
      .sort((a: any, b: any) => b.score - a.score)
      .forEach(({ franchise }: any) => {
        const metric = data.franchise_metrics.find(
          (row: any) => row.franchise_id === franchise.id,
        );
        if (!metric) return;
        results.push({
          year: 2021,
          type: "Franchise",
          title: franchise.display_name,
          detail: `${metric.wins}-${metric.losses}${metric.ties ? `-${metric.ties}` : ""} career record • ${Number(metric.win_pct).toFixed(1)}% win rate • ${metric.championships} title${metric.championships === 1 ? "" : "s"}`,
          href: `/franchises/${franchise.id}`,
          stats: [
            ["PF", Number(metric.pf).toFixed(1)],
            ["PA", Number(metric.pa).toFixed(1)],
            ["Avg finish", metric.average_finish],
            ["Legacy", metric.legacy_score],
          ],
        });
      });

    const tradeTerm = term.replace(/\btrade|trades|traded\b/g, "").trim();
    if (tradeTerm.length >= 2) {
      data.trade_analysis
        .filter((trade: any) =>
          normalize(
            trade.sides
              .map(
                (side: any) =>
                  `${side.franchise} ${side.assets.map((asset: any) => asset.player).join(" ")}`,
              )
              .join(" "),
          ).includes(tradeTerm),
        )
        .slice(0, 20)
        .forEach((trade: any) =>
          results.push({
            year: trade.season,
            type: "Trade",
            title: trade.sides
              .map(
                (side: any) =>
                  `${side.franchise}: ${side.assets.map((asset: any) => asset.player).join(", ")}`,
              )
              .join(" ↔ "),
            detail: `Week ${trade.week || "—"} • Algorithmic winner: ${trade.algorithmic_winner || "TBD"}`,
            href: `/trades?year=${trade.season}`,
          }),
        );
    }

    const draftTerm = term.replace(/\b(drafted|draft|who)\b/g, "").trim();
    if (draftTerm.length >= 2) {
      data.draft_picks
        .filter(
          (pick: any) =>
            fuzzyScore(
              `${pick.player} ${pick.franchise} ${pick.season} round ${pick.round_num}`,
              draftTerm,
            ) >= 35,
        )
        .slice(0, 18)
        .forEach((pick: any) =>
          results.push({
            year: pick.season,
            type: "Draft",
            title: `${pick.player} — ${pick.franchise}`,
            detail: `${pick.season} Round ${pick.round_num}, overall pick ${pick.overall_num}. ${Number(pick.tracked_future_points || 0).toFixed(1)} tracked future points.`,
            href: `/drafts?year=${pick.season}`,
          }),
        );
    }

    const keeperTerm = term.replace(/\b(keeper|kept|history)\b/g, "").trim();
    if (keeperTerm.length >= 2) {
      data.keepers
        .filter(
          (keeper: any) =>
            fuzzyScore(
              `${keeper.player} ${keeper.franchise} ${keeper.season} ${keeper.cost}`,
              keeperTerm,
            ) >= 34,
        )
        .slice(0, 18)
        .forEach((keeper: any) =>
          results.push({
            year: keeper.season,
            type: "Keeper",
            title: `${keeper.player} — ${keeper.franchise}`,
            detail: `${keeper.season} • Cost: ${keeper.cost} • ${keeper.keeper_year}`,
            href: "/keepers",
          }),
        );
    }

    const ruleTerm = term.replace(/\brules?\b/g, "").trim();
    if (ruleTerm.length >= 2) {
      data.rules
        .filter(
          (rule: any) =>
            fuzzyScore(`${rule.id} ${rule.category} ${rule.rule}`, ruleTerm) >= 32,
        )
        .slice(0, 12)
        .forEach((rule: any) =>
          results.push({
            year: 2021,
            type: "Rule",
            title: `${rule.id} — ${rule.category}`,
            detail: rule.rule,
            href: "/rules",
          }),
        );
    }

    const unique = new Map<string, any>();
    for (const result of results) {
      unique.set(`${result.type}-${result.title}-${result.year}`, result);
    }

    const sorted = [...unique.values()].sort((a, b) => {
      const yearDiff = (a.year || 9999) - (b.year || 9999);
      return sort === "desc" ? -yearDiff : yearDiff;
    });

    return {
      heading: `${sorted.length} result${sorted.length === 1 ? "" : "s"}`,
      results: sorted,
    };
  }, [data, query, sort]);

  function chooseSuggestion(suggestion: Suggestion) {
    setQuery(suggestion.query);
    setFocused(false);
    setActiveSuggestion(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!predictiveSuggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((current) =>
        current < predictiveSuggestions.length - 1 ? current + 1 : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((current) =>
        current > 0 ? current - 1 : predictiveSuggestions.length - 1,
      );
    } else if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      chooseSuggestion(predictiveSuggestions[activeSuggestion]);
    } else if (event.key === "Escape") {
      setFocused(false);
      setActiveSuggestion(-1);
      inputRef.current?.blur();
    }
  }

  if (error) return <div className="error">{error}</div>;
  if (!data) return <Loading />;

  const suggestions = [
    "George Pickens",
    "Shnoods vs Sammy",
    "Puka trade",
    "who drafted CeeDee Lamb",
    "who owned CMC",
    "CMC 2024 Week 11 PPR points",
  ];

  const groupedSuggestions = predictiveSuggestions.reduce(
    (groups: Record<string, Suggestion[]>, suggestion) => {
      groups[suggestion.group] ||= [];
      groups[suggestion.group].push(suggestion);
      return groups;
    },
    {},
  );

  return (
    <>
      <section className="searchHero">
        <div className="searchHeroInner">
          <span className="eyebrow">The OKFL knowledge engine</span>
          <h1>Ask the league historian anything.</h1>
          <p>
            Search OKFL history, compare franchises, trace players, or pull live NFL fantasy
            scores from the internet.
          </p>

          <div className="predictiveSearch">
            <div className="searchControls">
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => window.setTimeout(() => setFocused(false), 140)}
                onKeyDown={handleKeyDown}
                placeholder="Try: CMC 2024 Week 11 PPR points, who owned Puka, Shnoods vs Sammy…"
                aria-label="Search OKFL history"
                aria-autocomplete="list"
                aria-expanded={focused && predictiveSuggestions.length > 0}
              />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as "asc" | "desc")}
                aria-label="Sort results"
              >
                <option value="asc">Oldest first</option>
                <option value="desc">Newest first</option>
              </select>
            </div>

            {focused && predictiveSuggestions.length > 0 && (
              <div className="autocompletePanel" role="listbox">
                {Object.entries(groupedSuggestions).map(([group, rows]) => (
                  <div className="autocompleteGroup" key={group}>
                    <div className="autocompleteGroupTitle">{group}</div>
                    {rows.map((suggestion) => {
                      const globalIndex = predictiveSuggestions.findIndex(
                        (row) => row.id === suggestion.id,
                      );
                      return (
                        <button
                          type="button"
                          role="option"
                          aria-selected={globalIndex === activeSuggestion}
                          className={`autocompleteItem ${globalIndex === activeSuggestion ? "active" : ""}`}
                          key={suggestion.id}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => chooseSuggestion(suggestion)}
                        >
                          <span>
                            <b>{suggestion.label}</b>
                            <small>{suggestion.detail}</small>
                          </span>
                          <em>↵</em>
                        </button>
                      );
                    })}
                  </div>
                ))}
                <div className="autocompleteHint">
                  Use ↑ ↓ to move • Enter to choose • Esc to close
                </div>
              </div>
            )}
          </div>

          <div className="chips">
            {suggestions.map((suggestion) => (
              <button type="button" key={suggestion} onClick={() => setQuery(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </section>

      {liveIntent && (
        <section className="liveNflSection" aria-live="polite">
          <div className="liveNflHeading">
            <div>
              <span className="eyebrow">Live NFL lookup</span>
              <h2>
                {liveIntent.player} • {liveIntent.season} Week {liveIntent.week}
              </h2>
            </div>
            <span className="internetBadge">Internet-backed</span>
          </div>

          {liveLoading && (
            <div className="liveNflCard liveNflLoading">
              Fetching weekly NFL statistics…
            </div>
          )}

          {liveError && (
            <div className="liveNflCard liveNflError">
              <b>Could not complete the live lookup.</b>
              <span>{liveError}</span>
            </div>
          )}

          {liveResult && (
            <article className="liveNflCard">
              <div className="liveNflTopline">
                <div>
                  <span className="resultType">NFL Weekly Fantasy</span>
                  <h3>{liveResult.player}</h3>
                  <p>
                    {liveResult.team || "NFL team unavailable"}
                    {liveResult.opponent ? ` vs ${liveResult.opponent}` : ""} •{" "}
                    {liveResult.position || "Position unavailable"}
                  </p>
                </div>
                <div className="fantasyPointHero">
                  <b>{liveResult.fantasyPoints.toFixed(2)}</b>
                  <span>{liveResult.scoring.toUpperCase()} points</span>
                </div>
              </div>
              <div className="liveStatLine">{statLine(liveResult)}</div>
              <div className="liveNflFooter">
                <span>
                  Standard scoring: 1/reception, 0.1/yard, 6/rush or receiving TD,
                  4/pass TD.
                </span>
                <a href={liveResult.sourceUrl} target="_blank" rel="noreferrer">
                  Source: nflverse ↗
                </a>
              </div>
            </article>
          )}
        </section>
      )}

      {query && (
        <section className="searchResultsSection">
          <div className="resultHeader">
            <div>
              <span className="eyebrow">Search results</span>
              <h2>{search.heading}</h2>
            </div>
            <button
              className="clearButton"
              type="button"
              onClick={() => {
                setQuery("");
                setLiveResult(null);
                inputRef.current?.focus();
              }}
            >
              Clear
            </button>
          </div>

          <div className="results">
            {search.results.length ? (
              search.results.map((result, index) => (
                <article
                  className="resultCard"
                  key={`${result.type}-${result.title}-${index}`}
                >
                  <div className="resultMeta">
                    <span>{result.type}</span>
                    <span>{result.year === 9999 ? "—" : result.year}</span>
                  </div>
                  <h3>{result.title}</h3>
                  <p>{result.detail}</p>
                  {result.stats && (
                    <div className="resultStatGrid">
                      {result.stats.map(([label, value]: [string, any]) => (
                        <div key={label}>
                          <b>{value}</b>
                          <small>{label}</small>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.expanded && (
                    <div className="resultStatGrid">
                      {result.expanded.map(([label, value]: [string, any]) => (
                        <div key={label}>
                          <b>{value}</b>
                          <small>{label}</small>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.owners?.length ? (
                    <p className="owners">
                      <b>OKFL owners:</b> {result.owners.join(" → ")}
                    </p>
                  ) : null}
                  {result.href ? (
                    <Link className="resultLink" href={result.href}>
                      Explore →
                    </Link>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="emptyState">
                <h3>No local OKFL results found</h3>
                <p>
                  Try a player name, a franchise, “who drafted…”, “who owned…”, a
                  head-to-head query, or a live NFL week lookup.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
