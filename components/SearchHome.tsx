"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useData } from "./DataProvider";
import { Loading } from "./Page";

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();

function franchiseByTerm(data: any, term: string) {
  const clean = normalize(term);
  return data.franchises.find((franchise: any) =>
    normalize(`${franchise.name} ${franchise.display_name} ${franchise.current_manager} ${franchise.original_manager}`).includes(clean),
  );
}



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
    passingYards: number; passingTds: number; interceptions: number;
    rushingYards: number; rushingTds: number; receptions: number;
    receivingYards: number; receivingTds: number; fumblesLost: number;
  };
  source: string;
  sourceUrl: string;
};

function parseLiveNflQuery(raw: string) {
  const patterns = [
    /^(.+?)\s+(20\d{2})\s+(?:week|wk)\s*(\d{1,2})\s+(?:(half[- ]?ppr|standard|ppr)(?:\s+fantasy)?\s*points?)?$/i,
    /^how many (?:ppr )?(?:fantasy )?points did (.+?) score (?:in )?(20\d{2})\s+(?:week|wk)\s*(\d{1,2})\??$/i,
    /^(.+?)\s+(?:week|wk)\s*(\d{1,2})\s+(20\d{2})\s+(?:(half[- ]?ppr|standard|ppr)(?:\s+fantasy)?\s*points?)?$/i,
  ];

  for (let index = 0; index < patterns.length; index += 1) {
    const match = raw.trim().match(patterns[index]);
    if (!match) continue;
    if (index === 1) {
      return { player: match[1], season: Number(match[2]), week: Number(match[3]), scoring: "ppr" as const };
    }
    if (index === 2) {
      const scoringText = (match[4] || "ppr").toLowerCase().replace(" ", "-");
      return { player: match[1], season: Number(match[3]), week: Number(match[2]), scoring: scoringText === "half-ppr" ? "half-ppr" as const : scoringText === "standard" ? "standard" as const : "ppr" as const };
    }
    const scoringText = (match[4] || "ppr").toLowerCase().replace(" ", "-");
    return { player: match[1], season: Number(match[2]), week: Number(match[3]), scoring: scoringText === "half-ppr" ? "half-ppr" as const : scoringText === "standard" ? "standard" as const : "ppr" as const };
  }
  return null;
}

function statLine(result: LiveNflResult) {
  const s = result.stats;
  const pieces: string[] = [];
  if (s.passingYards || s.passingTds || s.interceptions) pieces.push(`${s.passingYards} pass yds, ${s.passingTds} pass TD, ${s.interceptions} INT`);
  if (s.rushingYards || s.rushingTds) pieces.push(`${s.rushingYards} rush yds, ${s.rushingTds} rush TD`);
  if (s.receptions || s.receivingYards || s.receivingTds) pieces.push(`${s.receptions} rec, ${s.receivingYards} rec yds, ${s.receivingTds} rec TD`);
  return pieces.join(" • ") || "No scoring statistics recorded";
}

function playerSummary(player: any) {
  const points = (player.season_stats || []).reduce((sum: number, row: any) => sum + Number(row.points || 0), 0);
  const owners = [...new Set((player.events || []).map((event: any) => event.franchise).filter(Boolean))];
  return {
    points,
    owners,
    firstYear: Math.min(...(player.rostered_seasons?.length ? player.rostered_seasons : [9999])),
    lastYear: Math.max(...(player.rostered_seasons?.length ? player.rostered_seasons : [0])),
  };
}

export function SearchHome() {
  const { data, error } = useData();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [liveResult, setLiveResult] = useState<LiveNflResult | null>(null);
  const [liveError, setLiveError] = useState("");
  const [liveLoading, setLiveLoading] = useState(false);

  const liveIntent = useMemo(() => parseLiveNflQuery(query), [query]);

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
        const response = await fetch(`/api/nfl/player-week?${params.toString()}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Live NFL lookup failed.");
        setLiveResult(payload);
      } catch (error) {
        if (controller.signal.aborted) return;
        setLiveResult(null);
        setLiveError(error instanceof Error ? error.message : String(error));
      } finally {
        if (!controller.signal.aborted) setLiveLoading(false);
      }
    }, 450);

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

    // Head-to-head: "Shnoods vs Sammy"
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
          year: Math.min(...games.map((game: any) => game.season), 9999),
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

    // Smart records queries
    if (/most championships|championship leaders|titles|goat/.test(term)) {
      const leaders = [...data.franchise_metrics]
        .sort((a: any, b: any) => b.championships - a.championships || b.legacy_score - a.legacy_score)
        .slice(0, 5);
      results.push({
        year: 2021,
        type: "Record",
        title: "Championship leaders",
        detail: leaders.map((row: any, index: number) => `${index + 1}. ${row.franchise} — ${row.championships}`).join(" • "),
        href: "/records",
      });
    }

    if (/highest score|biggest score|single week/.test(term)) {
      const top = [...data.weekly_games].sort((a: any, b: any) => Number(b.score) - Number(a.score))[0];
      if (top) results.push({
        year: top.season,
        type: "Record",
        title: `Highest tracked weekly score: ${Number(top.score).toFixed(2)}`,
        detail: `${top.franchise} vs ${top.opponent}, Week ${top.week} of ${top.season}.`,
        href: "/records",
      });
    }

    if (/biggest blowout|largest win|largest margin/.test(term)) {
      const top = [...data.weekly_games].sort((a: any, b: any) => Number(b.margin || 0) - Number(a.margin || 0))[0];
      if (top) results.push({
        year: top.season,
        type: "Record",
        title: `Biggest tracked win: ${Number(top.margin).toFixed(2)} points`,
        detail: `${top.franchise} over ${top.opponent}, Week ${top.week} of ${top.season}.`,
        href: "/records",
      });
    }

    // Player matches and rich player summaries
    data.players
      .filter((player: any) => normalize(player.name).includes(term))
      .slice(0, 12)
      .forEach((player: any) => {
        const summary = playerSummary(player);
        const keeperCount = (player.events || []).filter((event: any) => event.type === "Keeper").length;
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

    // Franchise and manager matches
    data.franchises
      .filter((franchise: any) => normalize(`${franchise.name} ${franchise.display_name} ${franchise.current_manager} ${franchise.original_manager}`).includes(term))
      .forEach((franchise: any) => {
        const metric = data.franchise_metrics.find((row: any) => row.franchise_id === franchise.id);
        if (!metric) return;
        results.push({
          year: 2021,
          type: "Franchise",
          title: franchise.display_name,
          detail: `${metric.wins}-${metric.losses}${metric.ties ? `-${metric.ties}` : ""} career record • ${Number(metric.win_pct).toFixed(1)}% win rate • ${metric.championships} title${metric.championships === 1 ? "" : "s"}`,
          href: "/franchises",
          stats: [
            ["PF", Number(metric.pf).toFixed(1)],
            ["PA", Number(metric.pa).toFixed(1)],
            ["Avg finish", metric.average_finish],
            ["Legacy", metric.legacy_score],
          ],
        });
      });

    // Trades by player or franchise
    data.trade_analysis
      .filter((trade: any) =>
        normalize(
          trade.sides
            .map((side: any) => `${side.franchise} ${side.assets.map((asset: any) => asset.player).join(" ")}`)
            .join(" "),
        ).includes(term.replace(/\btrade\b/g, "").trim()),
      )
      .slice(0, 20)
      .forEach((trade: any) => results.push({
        year: trade.season,
        type: "Trade",
        title: trade.sides.map((side: any) => `${side.franchise}: ${side.assets.map((asset: any) => asset.player).join(", ")}`).join(" ↔ "),
        detail: `Week ${trade.week || "—"} • Algorithmic winner: ${trade.algorithmic_winner || "TBD"}`,
        href: `/trades?year=${trade.season}`,
      }));

    // Draft matches
    data.draft_picks
      .filter((pick: any) => normalize(`${pick.player} ${pick.franchise} ${pick.season} round ${pick.round_num}`).includes(term.replace(/\b(drafted|draft|who)\b/g, "").trim()))
      .slice(0, 18)
      .forEach((pick: any) => results.push({
        year: pick.season,
        type: "Draft",
        title: `${pick.player} — ${pick.franchise}`,
        detail: `${pick.season} Round ${pick.round_num}, overall pick ${pick.overall_num}. ${Number(pick.tracked_future_points || 0).toFixed(1)} tracked future points.`,
        href: `/drafts?year=${pick.season}`,
      }));

    // Keeper matches
    data.keepers
      .filter((keeper: any) => normalize(`${keeper.player} ${keeper.franchise} ${keeper.season} ${keeper.cost}`).includes(term.replace(/\b(keeper|kept|history)\b/g, "").trim()))
      .slice(0, 18)
      .forEach((keeper: any) => results.push({
        year: keeper.season,
        type: "Keeper",
        title: `${keeper.player} — ${keeper.franchise}`,
        detail: `${keeper.season} • Cost: ${keeper.cost} • ${keeper.keeper_year}`,
        href: "/keepers",
      }));

    // Rule matches
    data.rules
      .filter((rule: any) => normalize(`${rule.id} ${rule.category} ${rule.rule}`).includes(term.replace(/\brules?\b/g, "").trim()))
      .slice(0, 12)
      .forEach((rule: any) => results.push({
        year: 2021,
        type: "Rule",
        title: `${rule.id} — ${rule.category}`,
        detail: rule.rule,
        href: "/rules",
      }));

    const unique = new Map<string, any>();
    for (const result of results) unique.set(`${result.type}-${result.title}-${result.year}`, result);
    const sorted = [...unique.values()].sort((a, b) => {
      const yearDiff = (a.year || 9999) - (b.year || 9999);
      return sort === "desc" ? -yearDiff : yearDiff;
    });

    return { heading: `${sorted.length} result${sorted.length === 1 ? "" : "s"}`, results: sorted };
  }, [data, query, sort]);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <Loading />;

  const suggestions = [
    "George Pickens",
    "Shnoods vs Sammy",
    "Puka trade",
    "who drafted CeeDee Lamb",
    "most championships",
    "biggest blowout",
  ];

  return (
    <>
      <section className="searchHero">
        <div className="searchHeroInner">
          <span className="eyebrow">The OKFL knowledge engine</span>
          <h1>Search every season, player, trade, keeper, draft, and record.</h1>
          <p>Ask a question or enter any player, manager, franchise, season, trade, or rule.</p>
          <div className="searchControls">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try: Shnoods vs Sammy, Puka keeper history, who drafted CeeDee…"
              aria-label="Search OKFL history"
            />
            <select value={sort} onChange={(event) => setSort(event.target.value as "asc" | "desc")} aria-label="Sort results">
              <option value="asc">Oldest first</option>
              <option value="desc">Newest first</option>
            </select>
          </div>
          <div className="chips">
            {suggestions.map((suggestion) => (
              <button type="button" key={suggestion} onClick={() => setQuery(suggestion)}>{suggestion}</button>
            ))}
          </div>
        </div>
      </section>

      {liveIntent && (
        <section className="liveNflSection" aria-live="polite">
          <div className="liveNflHeading">
            <div>
              <span className="eyebrow">Live NFL lookup</span>
              <h2>{liveIntent.player} • {liveIntent.season} Week {liveIntent.week}</h2>
            </div>
            <span className="internetBadge">Internet-backed</span>
          </div>
          {liveLoading && <div className="liveNflCard liveNflLoading">Fetching weekly NFL statistics…</div>}
          {liveError && <div className="liveNflCard liveNflError"><b>Could not complete the live lookup.</b><span>{liveError}</span></div>}
          {liveResult && (
            <article className="liveNflCard">
              <div className="liveNflTopline">
                <div>
                  <span className="resultType">NFL Weekly Fantasy</span>
                  <h3>{liveResult.player}</h3>
                  <p>{liveResult.team || "NFL team unavailable"}{liveResult.opponent ? ` vs ${liveResult.opponent}` : ""} • {liveResult.position || "Position unavailable"}</p>
                </div>
                <div className="fantasyPointHero">
                  <b>{liveResult.fantasyPoints.toFixed(2)}</b>
                  <span>{liveResult.scoring.toUpperCase()} points</span>
                </div>
              </div>
              <div className="liveStatLine">{statLine(liveResult)}</div>
              <div className="liveNflFooter">
                <span>Scored with standard full-PPR rules: 1 point/reception, 0.1/yard, 6/rush or receiving TD, 4/pass TD.</span>
                <a href={liveResult.sourceUrl} target="_blank" rel="noreferrer">Source: nflverse ↗</a>
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
            <button className="clearButton" type="button" onClick={() => setQuery("")}>Clear</button>
          </div>
          <div className="results">
            {search.results.length ? search.results.map((result, index) => (
              <article className="resultCard" key={`${result.type}-${result.title}-${index}`}>
                <div className="resultMeta"><span>{result.type}</span><span>{result.year === 9999 ? "—" : result.year}</span></div>
                <h3>{result.title}</h3>
                <p>{result.detail}</p>
                {result.stats && <div className="resultStatGrid">{result.stats.map(([label, value]: [string, any]) => <div key={label}><b>{value}</b><small>{label}</small></div>)}</div>}
                {result.expanded && <div className="resultStatGrid">{result.expanded.map(([label, value]: [string, any]) => <div key={label}><b>{value}</b><small>{label}</small></div>)}</div>}
                {result.owners?.length ? <p className="owners"><b>OKFL owners:</b> {result.owners.join(" → ")}</p> : null}
                {result.href ? <Link className="resultLink" href={result.href}>Explore →</Link> : null}
              </article>
            )) : <div className="emptyState"><h3>No results found</h3><p>Try a shorter player name, a franchise name, or one of the suggested searches.</p></div>}
          </div>
        </section>
      )}
    </>
  );
}
