"use client";

import { useMemo, useState } from "react";
import Providers from "../providers";
import { Page, Loading } from "@/components/Page";
import { useData } from "@/components/DataProvider";

function View() {
  const { data } = useData();
  const [season, setSeason] = useState(2025);
  const [week, setWeek] = useState(1);

  if (!data) return <Loading />;

  const seasons = [...new Set(data.weekly_games.map((game: any) => game.season))].sort((a, b) => b - a);
  const weeks = [...new Set(data.weekly_games.filter((game: any) => game.season === season).map((game: any) => game.week))].sort((a, b) => a - b);
  const games = data.weekly_games
    .filter((game: any) => game.season === season && game.week === week && game.franchise_id < game.opponent_id)
    .sort((a: any, b: any) => Number(b.score + b.opp_score) - Number(a.score + a.opp_score));

  const weekStats = useMemo(() => {
    const teamRows = data.weekly_games.filter((game: any) => game.season === season && game.week === week);
    const highest = [...teamRows].sort((a: any, b: any) => Number(b.score) - Number(a.score))[0];
    const closest = [...games].sort((a: any, b: any) => Math.abs(Number(a.margin)) - Math.abs(Number(b.margin)))[0];
    const biggest = [...games].sort((a: any, b: any) => Math.abs(Number(b.margin)) - Math.abs(Number(a.margin)))[0];
    const average = teamRows.length ? teamRows.reduce((sum: number, game: any) => sum + Number(game.score), 0) / teamRows.length : 0;
    return { highest, closest, biggest, average };
  }, [data.weekly_games, games, season, week]);

  const standings = data.regular_standings
    .filter((row: any) => row.season === season)
    .sort((a: any, b: any) => a.rank - b.rank);

  return (
    <Page title="Time Machine" subtitle="Revisit any archived OKFL week as a complete league snapshot.">
      <section className="timeMachineHero">
        <div>
          <span className="eyebrow">Historical broadcast mode</span>
          <h2>{season} • Week {week}</h2>
          <p>Select a season and week to reload the scoreboard, weekly leaders, and season context.</p>
        </div>
        <div className="timeSelectors">
          <label><span>Season</span><select value={season} onChange={(event) => { setSeason(Number(event.target.value)); setWeek(1); }}>{seasons.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>Week</span><select value={week} onChange={(event) => setWeek(Number(event.target.value))}>{weeks.map((value) => <option key={value}>{value}</option>)}</select></label>
        </div>
      </section>

      <section className="timeSummaryGrid">
        <article><span>Top scorer</span><b>{weekStats.highest?.franchise || "—"}</b><strong>{weekStats.highest ? Number(weekStats.highest.score).toFixed(2) : "—"}</strong></article>
        <article><span>League average</span><b>{weekStats.average.toFixed(2)}</b><strong>points</strong></article>
        <article><span>Closest game</span><b>{weekStats.closest ? `${weekStats.closest.franchise} vs ${weekStats.closest.opponent}` : "—"}</b><strong>{weekStats.closest ? `${Math.abs(Number(weekStats.closest.margin)).toFixed(2)}-point margin` : "—"}</strong></article>
        <article><span>Biggest win</span><b>{weekStats.biggest?.franchise || "—"}</b><strong>{weekStats.biggest ? `+${Math.abs(Number(weekStats.biggest.margin)).toFixed(2)}` : "—"}</strong></article>
      </section>

      <div className="timeMachineLayout">
        <section>
          <div className="sectionTitle"><div><span className="eyebrow">Week {week} scoreboard</span><h2>Archived matchups</h2></div><span>{games.length} games</span></div>
          <div className="scoreboardGrid">
            {games.map((game: any) => {
              const firstWon = Number(game.score) > Number(game.opp_score);
              return (
                <article className="scoreboardCard" key={`${game.franchise_id}-${game.opponent_id}`}>
                  <header><span>{season} WEEK {week}</span><b>{game.playoff ? "PLAYOFF" : "REGULAR SEASON"}</b></header>
                  <div className={firstWon ? "winner" : ""}><span>{game.franchise}</span><b>{Number(game.score).toFixed(2)}</b></div>
                  <div className={!firstWon ? "winner" : ""}><span>{game.opponent}</span><b>{Number(game.opp_score).toFixed(2)}</b></div>
                  <footer><span>Margin</span><b>{Math.abs(Number(game.margin)).toFixed(2)}</b></footer>
                </article>
              );
            })}
            {!games.length && <div className="card timeEmpty">No matchup data is available for this week.</div>}
          </div>
        </section>

        <aside className="card seasonContext">
          <span className="eyebrow">{season} season context</span>
          <h2>Final regular-season table</h2>
          <div className="miniStandings">
            {standings.map((row: any) => (
              <div key={row.franchise_id}>
                <span>{row.rank}</span>
                <b>{row.franchise}</b>
                <small>{row.record}</small>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </Page>
  );
}

export default function TimeMachine() {
  return <Providers><View /></Providers>;
}
