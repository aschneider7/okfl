"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "@/components/DataProvider";
import { answerQuery, suggestions, SearchResult } from "@/lib/searchEngine";
import { parseLiveNflQuery } from "@/lib/liveNflQuery";

const examples = [
  "CMC 2025 Week 4 PPR points",
  "2024 Week 11 Christian McCaffrey",
  "who owned Puka",
  "Shnoods vs Isaac",
  "most traded players",
  "highest scoring week",
];

export function SearchEngine3() {
  const { data } = useData();
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const [live, setLive] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [liveError, setLiveError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => (data ? suggestions(data, query, 18) : []), [data, query]);
  const answer = useMemo(() => (data ? answerQuery(data, query) : null), [data, query]);
  const liveIntent = useMemo(() => parseLiveNflQuery(query), [query]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!liveIntent) {
      setLive(null);
      setLiveError("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setLiveError("");
      try {
        const search = new URLSearchParams({
          player: liveIntent.player,
          season: String(liveIntent.season),
          week: String(liveIntent.week),
          scoring: liveIntent.scoring,
        });
        const response = await fetch(`/api/nfl/player-week?${search.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Weekly NFL lookup failed.");
        setLive(body);
      } catch (error) {
        if (controller.signal.aborted) return;
        setLive(null);
        setLiveError(error instanceof Error ? error.message : String(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 275);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [liveIntent]);

  function openResult(row: SearchResult) {
    setFocused(false);
    if (row.href) {
      router.push(row.href);
      return;
    }
    setQuery(row.title);
    inputRef.current?.focus();
  }

  function handleKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => (value + 1) % Math.max(1, rows.length));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => (value - 1 + Math.max(1, rows.length)) % Math.max(1, rows.length));
    }
    if (event.key === "Enter") {
      if (rows[active]) {
        event.preventDefault();
        openResult(rows[active]);
      }
    }
    if (event.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
    }
  }

  if (!data) return <div className="search3Loading">Building the OKFL knowledge index…</div>;

  const totalTouchdowns = live
    ? Number(live.stats.passingTds || 0) + Number(live.stats.rushingTds || 0) + Number(live.stats.receivingTds || 0)
    : 0;

  return (
    <div className="search3Page nflSearchPage">
      <section className="nflHero">
        <div className="nflHeroBadge">OKFL SEARCH ENGINE 3.1</div>
        <div className="nflHeroGrid">
          <div>
            <p className="nflKicker">LEAGUE HISTORY + LIVE NFL DATA</p>
            <h1>Ask one question.<br /><span>Get the whole story.</span></h1>
            <p className="nflHeroText">Search ownership, drafts, trades, rivalries, records, rules, or any player’s weekly fantasy stat line.</p>
          </div>
          <div className="nflSearchConsole">
            <div className="nflSearchInput">
              <span>⌕</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => window.setTimeout(() => setFocused(false), 180)}
                onKeyDown={handleKey}
                placeholder="Try: CMC 2025 Week 4 PPR points"
                aria-label="Search OKFL and weekly NFL statistics"
                aria-expanded={focused && rows.length > 0}
              />
              <kbd>ENTER</kbd>
            </div>

            {focused && query.trim().length >= 2 && rows.length > 0 && (
              <div className="nflAutocomplete" role="listbox">
                {rows.slice(0, 10).map((row, index) => (
                  <button
                    type="button"
                    className={active === index ? "active" : ""}
                    key={row.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => openResult(row)}
                    role="option"
                    aria-selected={active === index}
                  >
                    <i>{row.icon}</i>
                    <span><b>{row.title}</b><small>{row.group} • {row.detail}</small></span>
                    <em>OPEN</em>
                  </button>
                ))}
              </div>
            )}

            <div className="nflExamples">
              {examples.map((example) => (
                <button type="button" key={example} onClick={() => { setQuery(example); inputRef.current?.focus(); }}>
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="nflAnswerLayout">
        <main className="nflAnswerMain">
          {!query && (
            <div className="nflWelcomePanel">
              <div className="scoreboardHeader"><span>SEARCH PLAYBOOK</span><b>READY</b></div>
              <div className="nflWelcomeCopy">
                <h2>Start with a player, manager, matchup, season, or record.</h2>
                <p>Weekly stat searches now support multiple formats, including “Player 2025 Week 4,” “2025 Week 4 Player,” and “How many PPR points did Player score in 2025 Week 4?”</p>
              </div>
              <div className="nflFeatureGrid">
                <article><span>01</span><b>OKFL Archive</b><p>Ownership, keepers, trades, drafts, standings and head-to-head history.</p></article>
                <article><span>02</span><b>Weekly NFL Stats</b><p>Internet-backed PPR, half-PPR or standard scoring with full stat lines.</p></article>
                <article><span>03</span><b>Instant Navigation</b><p>Every predictive result is clickable and keyboard accessible.</p></article>
              </div>
            </div>
          )}

          {loading && <div className="nflStatusPanel"><i /><b>Fetching weekly NFL statistics…</b></div>}
          {liveError && <div className="nflErrorPanel"><b>Weekly lookup failed</b><p>{liveError}</p></div>}

          {live && (
            <article className="nflStatAnswer">
              <header className="nflStatHeader">
                <div>
                  <span>LIVE WEEKLY FANTASY RESULT</span>
                  <h2>{live.player}</h2>
                  <p>{live.season} WEEK {live.week} • {live.team || "NFL"}{live.opponent ? ` VS ${live.opponent}` : ""} • {String(live.scoring).toUpperCase()}</p>
                </div>
                <div className="nflPointTotal"><b>{Number(live.fantasyPoints).toFixed(2)}</b><small>FANTASY POINTS</small></div>
              </header>
              <div className="nflBoxScore">
                <div><b>{live.stats.passingYards}</b><span>PASS YDS</span></div>
                <div><b>{live.stats.passingTds}</b><span>PASS TD</span></div>
                <div><b>{live.stats.interceptions}</b><span>INT</span></div>
                <div><b>{live.stats.rushingYards}</b><span>RUSH YDS</span></div>
                <div><b>{live.stats.rushingTds}</b><span>RUSH TD</span></div>
                <div><b>{live.stats.receptions}</b><span>REC</span></div>
                <div><b>{live.stats.receivingYards}</b><span>REC YDS</span></div>
                <div><b>{live.stats.receivingTds}</b><span>REC TD</span></div>
              </div>
              <div className="nflStatFooter">
                <span>{totalTouchdowns} total TD • {live.stats.fumblesLost || 0} fumbles lost</span>
                <a href={live.sourceUrl} target="_blank" rel="noreferrer">SOURCE: NFLVERSE ↗</a>
              </div>
            </article>
          )}

          {!live && answer && (
            <article className="nflArchiveAnswer">
              <header>
                <div><span>{answer.eyebrow}</span><h2>{answer.title}</h2><p>{answer.summary}</p></div>
                {answer.heroValue && <div className="nflArchiveHero"><b>{answer.heroValue}</b><small>{answer.heroLabel}</small></div>}
              </header>
              {answer.stats && <div className="nflArchiveStats">{answer.stats.map((stat) => <div key={stat.label}><b>{stat.value}</b><small>{stat.label}</small></div>)}</div>}
              {answer.timeline && <div className="nflArchiveTimeline">{answer.timeline.map((item, index) => <div key={`${item.year}-${index}`}><span>{item.year}</span><b>{item.label}</b><small>{item.detail}</small></div>)}</div>}
              {answer.href && <footer><span>VERIFIED OKFL ARCHIVE</span><Link href={answer.href}>{answer.hrefLabel || "EXPLORE"} →</Link></footer>}
            </article>
          )}

          {query && !answer && !live && !loading && !liveError && (
            <div className="nflNoAnswer"><span>NO RESULT</span><h2>Choose a predictive result or try a weekly stat query.</h2><p>Example: “Saquon Barkley 2025 Week 8 PPR points.”</p></div>
          )}
        </main>

        <aside className="nflResultRail">
          <div className="nflRailHeader"><span>PREDICTIVE RESULTS</span><b>{query ? rows.length : "READY"}</b></div>
          {query ? rows.slice(0, 10).map((row) => (
            <button type="button" key={row.id} onClick={() => openResult(row)}>
              <i>{row.icon}</i>
              <span><b>{row.title}</b><small>{row.group} • {row.detail}</small>{row.preview && <em>{row.preview.slice(0, 2).map((item) => `${item.label}: ${item.value}`).join(" • ")}</em>}</span>
              <strong>›</strong>
            </button>
          )) : <div className="nflRailEmpty"><b>SEARCH SHORTCUTS</b><p>Press / or Ctrl+K from anywhere on the site.</p><code>/</code><code>CTRL K</code></div>}
        </aside>
      </section>
    </div>
  );
}
