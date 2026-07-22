"use client";

import Link from "next/link";
import {useAuth} from "@/components/AuthProvider";
import {useData} from "@/components/DataProvider";
import {Loading} from "@/components/Page";
import {SearchHome} from "@/components/SearchHome";
import {buildPowerRankings} from "@/lib/powerRankings";
import {PowerRankingsPreview} from "@/components/PowerRankingsPreview";

const toolLinks=[
  {href:"/live-league",code:"LIVE",title:"League Dashboard",detail:"Scores, standings, matchups, and the latest movement."},
  {href:"/playoff-odds",code:"ODDS",title:"Playoff Simulator",detail:"Run every remaining path to the six-team postseason."},
  {href:"/trades",code:"TRADE",title:"Trade Center",detail:"Model value, needs, keeper impact, and deal fairness."},
  {href:"/mock-draft",code:"DRAFT",title:"Draft Room",detail:"Practice against the OKFL-calibrated market."},
];

export default function Home(){
  const {data}=useData();
  const {account}=useAuth();
  if(!data)return <Loading/>;

  const archiveSeason=2025;
  const standings=data.regular_standings
    .filter((row:any)=>Number(row.season)===archiveSeason)
    .sort((a:any,b:any)=>Number(a.rank)-Number(b.rank))
    .slice(0,5);
  const weeklyLeaders=[...data.weekly_games]
    .sort((a:any,b:any)=>Number(b.score)-Number(a.score))
    .slice(0,4);
  const recentTrades=[...data.trade_analysis]
    .sort((a:any,b:any)=>Number(b.season)-Number(a.season)||Number(b.week||0)-Number(a.week||0))
    .slice(0,3);
  const legacy=[...data.franchise_metrics]
    .sort((a:any,b:any)=>Number(b.legacy_score)-Number(a.legacy_score))
    .slice(0,3);
  const power=buildPowerRankings(data).slice(0,3);
  const powerLeader=power[0];
  const weeklyRecord=weeklyLeaders[0];
  const latestTrade=recentTrades[0];
  const personalHref=account?"/account":"/login";
  const personalLabel=account?"Open My Franchise":"Manager Sign In";

  const tradeHeadline=(trade:any)=>trade?.sides?.map((side:any)=>side.franchise).join(" ↔ ")||"No completed trade";
  const tradeAssets=(trade:any)=>trade?.sides?.map((side:any)=>`${side.franchise}: ${side.assets?.map((asset:any)=>asset.player).join(", ")}`).join(" · ")||"The transaction desk is quiet.";

  return <div className="home9">
    <section className="home9Hero">
      <div className="home9HeroCopy">
        <span className="home9Status"><i/>2026 league command</span>
        <h1>The whole league.<br/><em>One clear view.</em></h1>
        <p>Live competition, five seasons of history, and every front-office tool the OKFL needs—organized around the next decision.</p>
        <div className="home9HeroActions">
          <Link href={personalHref}>{personalLabel}<span>→</span></Link>
          <Link href="/live-league">Open Live Dashboard</Link>
        </div>
      </div>
      <aside className="home9CommandCard" aria-label="League pulse">
        <header><div><span>League pulse</span><b>Archive synchronized</b></div><i/></header>
        <div className="home9CommandLead"><span>Current power leader</span><b>{powerLeader?.franchise||"—"}</b><small>{powerLeader?`${powerLeader.tier} · ${powerLeader.score} power score`:"Rankings awaiting data"}</small></div>
        <div className="home9CommandStats">
          <div><span>Format</span><b>2QB Full PPR</b></div>
          <div><span>Teams</span><b>{data.franchises.length}</b></div>
          <div><span>History</span><b>5 seasons</b></div>
        </div>
      </aside>
    </section>

    <section className="home9Search" id="league-search" aria-label="Search league history"><SearchHome/></section>

    <section className="home9PulseGrid" aria-label="League highlights">
      <article className="home9PulseCard featured"><span>Power index · No. 1</span><b>{powerLeader?.franchise||"—"}</b><p>{powerLeader?.summary||"The preseason model is preparing its first ranking."}</p><Link href="/power-rankings">Full rankings →</Link></article>
      <article className="home9PulseCard"><span>All-time weekly record</span><b>{weeklyRecord?Number(weeklyRecord.score).toFixed(2):"—"}</b><p>{weeklyRecord?`${weeklyRecord.franchise} · ${weeklyRecord.season} Week ${weeklyRecord.week}`:"No weekly result available."}</p><Link href="/records">Record book →</Link></article>
      <article className="home9PulseCard"><span>Latest transaction</span><b>{tradeHeadline(latestTrade)}</b><p>{latestTrade?`${latestTrade.season} · Week ${latestTrade.week||"—"}`:"Awaiting the next move."}</p><Link href="/trades">Transaction desk →</Link></article>
      <article className="home9PulseCard compact"><span>Verified archive</span><b>{data.players.length.toLocaleString()}</b><p>Tracked players across drafts, rosters, keepers, trades, and weekly scoring.</p><Link href="/time-machine">Enter archive →</Link></article>
    </section>

    <section className="home9SectionHead">
      <div><span className="eyebrow">Your workspace</span><h2>Move through the league faster.</h2></div>
      <p>Four direct paths to the tools managers use most.</p>
    </section>
    <section className="home9Tools">
      {toolLinks.map((tool,index)=><Link href={tool.href} key={tool.href}>
        <span><i>{String(index+1).padStart(2,"0")}</i>{tool.code}</span>
        <h3>{tool.title}</h3><p>{tool.detail}</p><b>Open tool <em>→</em></b>
      </Link>)}
    </section>

    <section className="home9SectionHead split">
      <div><span className="eyebrow">League position</span><h2>Standings meet power.</h2></div>
      <p>Last season’s final table beside the current front-office model.</p>
    </section>
    <section className="home9Rankings">
      <article className="home9TableCard">
        <header><div><span>{archiveSeason} final table</span><h3>Regular-season leaders</h3></div><Link href="/records">All standings →</Link></header>
        <div className="home9TableHead"><span>Rank</span><span>Franchise</span><span>Record</span><span>Points</span></div>
        <div className="home9TableRows">{standings.map((row:any)=><Link href={`/franchises/${row.franchise_id}`} key={row.franchise_id}><i>{row.rank}</i><b>{row.franchise}</b><span>{row.record}</span><strong>{row.points?Number(row.points).toFixed(1):"—"}</strong></Link>)}</div>
      </article>
      <PowerRankingsPreview fallback={power} variant="home9"/>
    </section>

    <section className="home9Activity">
      <article>
        <header><div><span className="eyebrow">Transaction wire</span><h3>Recent deals</h3></div><Link href="/trades">Analyze a trade →</Link></header>
        <div className="home9TradeList">{recentTrades.map((trade:any)=><Link href="/trades" key={trade.transaction_id}><span>{trade.season}<small>Week {trade.week||"—"}</small></span><div><b>{tradeHeadline(trade)}</b><p>{tradeAssets(trade)}</p></div><strong>{trade.algorithmic_winner||"Review"}</strong></Link>)}</div>
      </article>
      <article>
        <header><div><span className="eyebrow">League history</span><h3>Legacy leaders</h3></div><Link href="/franchises">Scout all teams →</Link></header>
        <div className="home9LegacyList">{legacy.map((team:any,index)=><Link href={`/franchises/${team.franchise_id}`} key={team.franchise_id}><i>{index+1}</i><div><b>{team.franchise}</b><small>{team.championships} title{team.championships===1?"":"s"}</small></div><strong>{team.legacy_score}</strong></Link>)}</div>
      </article>
    </section>

    <section className="home9Closing">
      <div><span>Weekly intelligence</span><h2>The league story changes every week.</h2><p>Follow the recap, award races, playoff movement, and the decisions shaping the next Sunday.</p></div>
      <div><Link href="/weekly-recap">Read Weekly Recap</Link><Link href="/league-awards">View Awards Race</Link></div>
    </section>
  </div>;
}
