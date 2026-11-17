"use client";

import Link from "next/link";
import {useAuth} from "@/components/AuthProvider";
import {useData} from "@/components/DataProvider";
import {Loading} from "@/components/Page";
import {SearchHome} from "@/components/SearchHome";
import {buildPowerRankings} from "@/lib/powerRankings";
import {PowerRankingsPreview} from "@/components/PowerRankingsPreview";
import {useLeagueDashboard} from "@/components/useLeagueDashboard";

const quickLinks=[
  {href:"/live-league",label:"Live League",detail:"Scores, matchups, standings"},
  {href:"/playoff-odds",label:"Playoff Odds",detail:"Simulate every remaining path"},
  {href:"/trades",label:"Trade Center",detail:"Build and evaluate a deal"},
  {href:"/mock-draft",label:"Draft Room",detail:"Practice against the OKFL market"},
];

export default function Home(){
  const {data}=useData();
  const {account}=useAuth();
  const {dashboard,power:livePower}=useLeagueDashboard(data);
  if(!data)return <Loading/>;

  const archiveSeason=2025;
  const archiveStandings=data.regular_standings
    .filter((row:any)=>Number(row.season)===archiveSeason)
    .sort((a:any,b:any)=>Number(a.rank)-Number(b.rank))
    .slice(0,5);
  const standings=dashboard.available
    ?dashboard.standings.slice(0,5).map((team,index)=>({rank:index+1,franchise_id:team.franchiseId,franchise:team.franchise,record:`${team.wins}-${team.losses}${team.ties?`-${team.ties}`:""}`,points:team.points}))
    :archiveStandings;
  const standingsLabel=dashboard.available?`2026 live table · Week ${dashboard.currentWeek}`:`${archiveSeason} final table`;
  const scores=[...data.weekly_games].sort((a:any,b:any)=>Number(b.score)-Number(a.score));
  const record=scores[0];
  const archiveTrades=[...data.trade_analysis]
    .sort((a:any,b:any)=>Number(b.season)-Number(a.season)||Number(b.week||0)-Number(a.week||0))
    .slice(0,2);
  const power=(livePower.length?livePower:buildPowerRankings(data)).slice(0,3);
  const powerLeader=power[0];
  const accountHref=account?"/account":"/login";
  const accountLabel=account?"Open My Franchise":"Manager Sign In";

  const tradeTitle=(trade:any)=>trade?.sides?.map((side:any)=>side.franchise).join(" ↔ ")||"No recent trade";
  const tradeDetail=(trade:any)=>trade?.sides?.map((side:any)=>`${side.franchise}: ${side.assets?.map((asset:any)=>asset.player).join(", ")}`).join(" · ")||"The transaction wire is quiet.";
  const activity=dashboard.available&&dashboard.activity.length
    ?dashboard.activity.slice(0,2).map((item)=>({title:item.title,detail:item.detail,meta:item.type}))
    :archiveTrades.map((trade:any)=>({title:tradeTitle(trade),detail:tradeDetail(trade),meta:`${trade.season} · Week ${trade.week||"—"}`}));

  return <div className="homeCalm">
    <section className="homeCalmHero">
      <div className="homeCalmLead">
        <span className="homeCalmKicker"><i/>2026 league headquarters</span>
        <h1>Everything happening<br/>in the <em>OKFL.</em></h1>
        <p>Scores, history, rankings, trades, and draft tools in one focused view built for the people in this league.</p>
        <div className="homeCalmActions">
          <Link href={accountHref}>{accountLabel}<span>→</span></Link>
          <Link href="/live-league">View Live League</Link>
        </div>
      </div>
      <aside className="homeCalmSnapshot" aria-label="League snapshot">
        <header><span>League snapshot</span><small>{dashboard.available?`Live · Week ${dashboard.currentWeek}`:"Archive online"}</small></header>
        <div className="homeCalmLeader"><span>Power ranking leader</span><b>{powerLeader?.franchise||"—"}</b><small>{powerLeader?`${powerLeader.score} power score · ${powerLeader.tier}`:"Rankings awaiting data"}</small></div>
        <dl>
          <div><dt>Format</dt><dd>2QB PPR</dd></div>
          <div><dt>Teams</dt><dd>{data.franchises.length}</dd></div>
          <div><dt>Seasons</dt><dd>5</dd></div>
        </dl>
      </aside>
    </section>

    <section className="homeCalmSearch" id="league-search" aria-label="Search league history"><SearchHome/></section>

    <nav className="homeCalmQuick" aria-label="League tools">
      {quickLinks.map((item,index)=><Link href={item.href} key={item.href}>
        <i>{String(index+1).padStart(2,"0")}</i><span><b>{item.label}</b><small>{item.detail}</small></span><em>→</em>
      </Link>)}
    </nav>

    <section className="homeCalmHeading">
      <div><span className="eyebrow">League intelligence</span><h2>What matters right now.</h2></div>
      <p>Live models and the latest league activity, without the clutter.</p>
    </section>

    <section className="homeCalmNow">
      <div className="homeCalmStories">
        <Link href="/weekly-recap" className="homeCalmStory primary">
          <span>Weekly recap</span><h3>The week, explained.</h3><p>Matchup stories, standout performances, standings movement, and playoff implications.</p><b>Read the latest recap →</b>
        </Link>
        <div className="homeCalmStoryPair">
          <Link href="/league-awards" className="homeCalmStory"><span>Awards race</span><h3>Who is leading?</h3><p>Follow every player and manager award.</p><b>View the ballot →</b></Link>
          <Link href="/playoff-odds" className="homeCalmStory"><span>Postseason model</span><h3>Every path counts.</h3><p>See each franchise’s route to the playoffs.</p><b>Run the simulator →</b></Link>
        </div>
      </div>
      <PowerRankingsPreview fallback={power} variant="homeCalm" autoRefresh={false}/>
    </section>

    <section className="homeCalmData">
      <article className="homeCalmStandings">
        <header><div><span>{standingsLabel}</span><h3>Regular-season leaders</h3></div><Link href={dashboard.available?"/live-league":"/records"}>{dashboard.available?"Live dashboard":"Full standings"} →</Link></header>
        <div className="homeCalmTableHead"><span>#</span><span>Franchise</span><span>Record</span><span>Points</span></div>
        <div>{standings.map((row:any)=><Link href={`/franchises/${row.franchise_id}`} key={row.franchise_id}><i>{row.rank}</i><b>{row.franchise}</b><span>{row.record}</span><strong>{row.points?Number(row.points).toFixed(1):"—"}</strong></Link>)}</div>
      </article>
      <aside className="homeCalmRail">
        <div className="homeCalmRecord"><span>All-time weekly record</span><b>{record?Number(record.score).toFixed(2):"—"}</b><strong>{record?.franchise||"—"}</strong><small>{record?`${record.season} · Week ${record.week}`:"No score available"}</small><Link href="/records">Open record book →</Link></div>
        <div className="homeCalmTrades"><header><span>Transaction wire</span><Link href="/trades">All trades →</Link></header>{activity.map((item,index)=><Link href="/trades" key={`${item.title}-${index}`}><b>{item.title}</b><p>{item.detail}</p><small>{item.meta}</small></Link>)}</div>
      </aside>
    </section>
  </div>;
}
