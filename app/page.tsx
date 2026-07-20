"use client";

import Link from "next/link";
import {useData} from "@/components/DataProvider";
import {Loading} from "@/components/Page";
import {SearchHome} from "@/components/SearchHome";
import {buildPowerRankings} from "@/lib/powerRankings";
import {PowerRankingsPreview} from "@/components/PowerRankingsPreview";

export default function Home() {
  const {data} = useData();
  if (!data) return <Loading />;
  const season = 2025;
  const standings = data.regular_standings.filter((row: any) => row.season === season).sort((a: any, b: any) => a.rank - b.rank).slice(0, 5);
  const scores = [...data.weekly_games].sort((a: any, b: any) => Number(b.score) - Number(a.score)).slice(0, 5);
  const trades = [...data.trade_analysis].sort((a: any, b: any) => Number(b.season) - Number(a.season) || Number(b.week || 0) - Number(a.week || 0)).slice(0, 4);
  const legacy = [...data.franchise_metrics].sort((a: any, b: any) => Number(b.legacy_score) - Number(a.legacy_score)).slice(0, 5);
  const record = scores[0];
  const power = buildPowerRankings(data).slice(0, 3);
  return <div className="home2">
    <section className="home2Hero"><div><span className="eyebrow">The official OKFL command center</span><h1>Know the league.<br />Own the next move.</h1><p>Five seasons of league history, every franchise decision, and a live 2026 toolkit—connected in one front-office workspace.</p><div className="home2Actions"><a href="#league-search">Search the archive</a><Link href="/trades">Open Trade Center</Link></div></div>
      <div className="home2FeatureScore"><span>All-time weekly record</span><b>{record ? Number(record.score).toFixed(2) : "—"}</b><strong>{record?.franchise || "—"}</strong><small>{record ? `${record.season} · Week ${record.week} · vs ${record.opponent}` : "No data"}</small></div></section>
    <section id="league-search" className="home2Search"><SearchHome /></section>
    <section className="home2Ticker"><div><span>Format</span><b>2QB Full PPR</b></div><div><span>Franchises</span><b>10</b></div><div><span>Seasons</span><b>5 archived</b></div><div><span>Trades</span><b>{data.trade_analysis.length}</b></div><div><span>Players</span><b>{data.players.length}</b></div></section>
    <PowerRankingsPreview fallback={power}/>
    <div className="homeBriefingHead"><div><span className="eyebrow">League briefing</span><h2>Everything that matters, at a glance.</h2></div><span>Updated from the verified archive</span></div>
    <section className="home2Grid">
      <article className="home2Panel"><header><div><span className="eyebrow">{season} final table</span><h2>Regular-season leaders</h2></div><Link href="/records">Records →</Link></header><div className="home2Rows">{standings.map((row: any) => <div key={row.franchise_id}><span>{row.rank}</span><b>{row.franchise}</b><small>{row.record}</small><strong>{row.points ? Number(row.points).toFixed(1) : "—"}</strong></div>)}</div></article>
      <article className="home2Panel"><header><div><span className="eyebrow">All-time hierarchy</span><h2>Legacy leaderboard</h2></div><Link href="/franchises">Franchises →</Link></header><div className="home2Rows">{legacy.map((row: any, index: number) => <div key={row.franchise_id}><span>{index + 1}</span><b>{row.franchise}</b><small>{row.championships} titles</small><strong>{row.legacy_score}</strong></div>)}</div></article>
      <article className="home2Panel"><header><div><span className="eyebrow">Transaction desk</span><h2>Recent trades</h2></div><Link href="/trades">Analyze →</Link></header><div className="home2Trades">{trades.map((trade: any) => <div key={trade.transaction_id}><span>{trade.season} · Week {trade.week || "—"}</span><p>{trade.sides.map((side: any) => `${side.franchise}: ${side.assets.map((asset: any) => asset.player).join(", ")}`).join(" ↔ ")}</p><b>Winner: {trade.algorithmic_winner || "TBD"}</b></div>)}</div></article>
      <article className="home2Panel"><header><div><span className="eyebrow">Record book</span><h2>Highest weekly scores</h2></div><Link href="/records">Full book →</Link></header><div className="home2Rows">{scores.map((game: any, index: number) => <div key={`${game.season}-${game.week}-${game.franchise_id}`}><span>{index + 1}</span><b>{game.franchise}</b><small>{game.season} W{game.week}</small><strong>{Number(game.score).toFixed(2)}</strong></div>)}</div></article>
    </section>
  </div>;
}
