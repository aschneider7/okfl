"use client";

import {Page, Loading} from "@/components/Page";
import {useData} from "@/components/DataProvider";
import {fmt} from "@/lib/data";

export default function Records() {
  const {data} = useData();
  if (!data) return <Loading />;
  const metrics = [...data.franchise_metrics].sort((a, b) => b.legacy_score - a.legacy_score);
  const weekly = [...data.weekly_games].sort((a: any, b: any) => Number(b.score) - Number(a.score));
  const highScore = weekly[0];
  const biggestWin = [...data.weekly_games].sort((a: any, b: any) => Number(b.margin || 0) - Number(a.margin || 0))[0];
  const titleLeader = [...metrics].sort((a, b) => b.championships - a.championships || b.legacy_score - a.legacy_score)[0];

  return <Page title="Record Book" subtitle="The definitive OKFL ledger: championships, career standings, scoring peaks, and league-defining performances.">
    <section className="archivePageHero recordBookHero"><div><span className="eyebrow">Official league ledger</span><h2>Built to remember everything.</h2><p>Every title, all-time record, points total, and historic weekly performance—verified across the full archive.</p></div>
      <div className="recordHeadline"><span>Highest weekly score</span><b>{Number(highScore.score).toFixed(2)}</b><strong>{highScore.franchise}</strong><small>{highScore.season} · Week {highScore.week}</small></div></section>

    <section className="recordSpotlights"><article><span>Legacy leader</span><b>{metrics[0].franchise}</b><strong>{metrics[0].legacy_score}</strong><small>legacy score</small></article><article><span>Championship standard</span><b>{titleLeader.franchise}</b><strong>{titleLeader.championships}</strong><small>career titles</small></article><article><span>Largest victory</span><b>{biggestWin.franchise}</b><strong>+{Number(biggestWin.margin).toFixed(2)}</strong><small>{biggestWin.season} · Week {biggestWin.week}</small></article></section>

    <section className="legacyPodium"><div className="sectionTitle"><div><span className="eyebrow">All-time hierarchy</span><h2>The OKFL podium</h2></div><span>Legacy score combines winning, scoring, and postseason success</span></div>
      <div className="podiumGrid">{metrics.slice(0, 3).map((metric, index) => <article key={metric.franchise_id} className={`place-${index + 1}`}><span>#{index + 1}</span><div><small>{data.franchises.find((franchise) => franchise.id === metric.franchise_id)?.current_manager || "Franchise"}</small><h2>{metric.franchise}</h2><p>{metric.wins}-{metric.losses}{metric.ties ? `-${metric.ties}` : ""} all time · {metric.championships} title{metric.championships === 1 ? "" : "s"}</p></div><b>{metric.legacy_score}</b></article>)}</div></section>

    <div className="recordBookLayout"><section className="card recordLedger"><div className="keeperTableHeader"><div><span className="eyebrow">Career standings</span><h2>Every franchise, ranked</h2></div><span>{metrics.length} teams</span></div><div className="tableWrap"><table><thead><tr><th>Rank</th><th>Franchise</th><th>Record</th><th>Win %</th><th>PF</th><th>PA</th><th>Titles</th><th>Legacy</th></tr></thead><tbody>{metrics.map((metric, index) => <tr key={metric.franchise_id}><td><span className="rankMedal">{index + 1}</span></td><td><b>{metric.franchise}</b></td><td>{metric.wins}-{metric.losses}{metric.ties ? `-${metric.ties}` : ""}</td><td>{Number(metric.win_pct).toFixed(1)}%</td><td>{fmt(metric.pf)}</td><td>{fmt(metric.pa)}</td><td><span className="titleCount">{metric.championships}</span></td><td><strong className="valueNumber">{metric.legacy_score}</strong></td></tr>)}</tbody></table></div></section>
      <aside className="card weeklyTop"><span className="eyebrow">Scoring peaks</span><h2>Top weekly scores</h2><div>{weekly.slice(0, 8).map((game: any, index: number) => <article key={`${game.season}-${game.week}-${game.franchise_id}`}><span>{index + 1}</span><div><b>{game.franchise}</b><small>{game.season} · Week {game.week} · vs {game.opponent}</small></div><strong>{Number(game.score).toFixed(2)}</strong></article>)}</div></aside></div>

    <section className="championshipTimeline"><div className="sectionTitle"><div><span className="eyebrow">Championship history</span><h2>The title timeline</h2></div><span>{data.championship_history.length} completed seasons</span></div><div>{data.championship_history.map((champion: any) => <article key={champion.season}><span>{champion.season}</span><div><b>{champion.manager}</b><small>{champion.franchise}</small></div><strong>Title #{champion.manager_title_number}</strong></article>)}</div></section>
  </Page>;
}
