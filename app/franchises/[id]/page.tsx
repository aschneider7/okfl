"use client";

import Link from "next/link";
import {useParams} from "next/navigation";
import Providers from "../../providers";
import {Loading} from "@/components/Page";
import {useData} from "@/components/DataProvider";
import {fmt} from "@/lib/data";
import {buildFranchiseProfile} from "@/lib/franchiseProfiles";

function View(){
  const params=useParams<{id:string}>();
  const {data}=useData();
  if(!data)return <Loading/>;
  const profile=buildFranchiseProfile(data,String(params.id).toUpperCase());
  if(!profile)return <div className="card">Franchise not found.</div>;

  const {franchise,metric,tags,dna,signature,strongest,weakest,records,summary,lenses,relationships}=profile;
  const regular=data.regular_standings.filter((row:any)=>row.franchise_id===franchise.id).sort((a:any,b:any)=>a.season-b.season);
  const draftGrades=data.draft_grades.filter((row:any)=>row.franchise_id===franchise.id).sort((a:any,b:any)=>a.season-b.season);
  const trades=data.trade_analysis.filter((trade:any)=>trade.sides.some((side:any)=>side.franchise_id===franchise.id)).sort((a:any,b:any)=>b.season-a.season||Number(b.week||0)-Number(a.week||0));
  const keepers=data.keepers.filter((keeper:any)=>keeper.franchise_id===franchise.id).sort((a:any,b:any)=>b.season-a.season);

  return <div className="franchiseDetail">
    <Link className="backLink" href="/franchises">← All franchises</Link>
    <section className="franchiseHero">
      <div className="heroIdentity">
        <span className="franchiseId">{franchise.id}</span>
        <div><span className="eyebrow">Franchise scouting report</span><h1>{franchise.name}</h1><p>Current manager: {franchise.current_manager} • Original manager: {franchise.original_manager}</p></div>
      </div>
      <div className="heroSignature"><span>{signature.icon}</span><div><small>Signature identity</small><b>{signature.label}</b></div></div>
    </section>

    <section className="careerStrip">
      <div><b>{metric.wins}-{metric.losses}{metric.ties?`-${metric.ties}`:""}</b><small>Record</small></div>
      <div><b>{Number(metric.win_pct).toFixed(1)}%</b><small>Win rate</small></div>
      <div><b>{fmt(metric.pf)}</b><small>Points for</small></div>
      <div><b>{fmt(metric.pa)}</b><small>Points against</small></div>
      <div><b>{metric.championships}</b><small>Titles</small></div>
      <div><b>{metric.runner_ups}</b><small>Runner-ups</small></div>
      <div><b>{metric.average_finish}</b><small>Avg finish</small></div>
      <div><b>{metric.legacy_score}</b><small>Legacy</small></div>
    </section>

    <div className="detailGrid">
      <article className="card identityStory"><span className="eyebrow">Front-office identity</span><h2>{summary}</h2><p>{signature.detail}</p><div className="profileTags largeTags">{tags.map((tag)=><em className={`tone-${tag.tone}`} key={tag.label}><span>{tag.icon}</span><div><b>{tag.label}</b><small>{tag.detail}</small></div></em>)}</div></article>
      <article className="card dnaPanel"><span className="eyebrow">Franchise DNA</span><h2>Behavioral profile</h2>{dna.map((row)=><div className="dnaRow" key={row.label}><div><b>{row.label}</b><small>{row.detail}</small></div><i><span style={{width:`${row.value}%`}}/></i><strong>{row.value}</strong></div>)}</article>
    </div>

    <section className="card scoutingLenses"><div className="sectionHeading"><div><span className="eyebrow">Four-part scouting model</span><h2>How this front office operates</h2></div></div><div>{lenses.map((lens)=><article className={`tone-${lens.tone}`} key={lens.label}><span>{lens.label}</span><b>{lens.value}</b><p>{lens.detail}</p></article>)}</div></section>

    <section className="insightCards">
      <article className="card"><span>Strongest trait</span><b>{strongest.label}</b><p>{strongest.detail}</p></article>
      <article className="card"><span>Least pronounced</span><b>{weakest.label}</b><p>{weakest.detail}</p></article>
      <article className="card"><span>Best weekly score</span><b>{records.bestGame?Number(records.bestGame.score).toFixed(2):"—"}</b><p>{records.bestGame?`${records.bestGame.season} Week ${records.bestGame.week} vs ${records.bestGame.opponent}`:"No game data"}</p></article>
      <article className="card"><span>Biggest win</span><b>{records.biggestWin?`+${Number(records.biggestWin.margin).toFixed(2)}`:"—"}</b><p>{records.biggestWin?`${records.biggestWin.season} Week ${records.biggestWin.week} vs ${records.biggestWin.opponent}`:"No game data"}</p></article>
      <article className="card"><span>Toughest matchup</span><b>{relationships.nemesis?.name||"—"}</b><p>{relationships.nemesis?`${relationships.nemesis.wins}-${relationships.nemesis.losses}${relationships.nemesis.ties?`-${relationships.nemesis.ties}`:""} across ${relationships.nemesis.games} meetings`:"No matchup data"}</p></article>
      <article className="card"><span>Favorite matchup</span><b>{relationships.favorite?.name||"—"}</b><p>{relationships.favorite?`${relationships.favorite.wins}-${relationships.favorite.losses}${relationships.favorite.ties?`-${relationships.favorite.ties}`:""} across ${relationships.favorite.games} meetings`:"No matchup data"}</p></article>
    </section>

    <section className="card">
      <div className="sectionHeading"><div><span className="eyebrow">Five-season résumé</span><h2>Final bracket finishes</h2></div></div>
      <div className="bigFinishTimeline">{metric.season_finishes.map((finish:any)=><div className={finish.finish<=3?"podium":""} key={finish.season}><span>{finish.season}</span><b>#{finish.finish}</b><small>{finish.finish===1?"Champion":finish.finish===2?"Runner-up":finish.finish===3?"Third place":"Final finish"}</small></div>)}</div>
    </section>

    <div className="detailGrid lowerGrid">
      <article className="card"><span className="eyebrow">Regular seasons</span><h2>Year-by-year performance</h2><div className="profileTable">{regular.map((row:any)=><div key={row.season}><b>{row.season}</b><span>#{row.rank} regular season</span><span>{row.record}</span><span>{row.points?`${fmt(row.points)} pts`:"—"}</span></div>)}</div></article>
      <article className="card"><span className="eyebrow">Draft room</span><h2>Draft grades</h2><div className="profileTable">{draftGrades.map((row:any)=><div key={row.season}><b>{row.season}</b><span>Grade {row.grade}</span><span>{row.score}</span><span>{row.top_values?.[0]?.player||"—"}</span></div>)}</div></article>
      <article className="card"><span className="eyebrow">Trade desk</span><h2>Recent deals</h2><div className="activityList">{trades.slice(0,6).map((trade:any)=><div key={trade.transaction_id}><b>{trade.season} • Week {trade.week||"—"}</b><p>{trade.sides.map((side:any)=>`${side.franchise}: ${side.assets.map((asset:any)=>asset.player).join(", ")}`).join(" ↔ ")}</p></div>)}{!trades.length&&<p>No tracked trades.</p>}</div></article>
      <article className="card"><span className="eyebrow">Keeper desk</span><h2>Recent keeper decisions</h2><div className="activityList">{keepers.slice(0,8).map((keeper:any)=><div key={`${keeper.season}-${keeper.player}`}><b>{keeper.player}</b><p>{keeper.season} • {keeper.cost} • {keeper.keeper_year}</p></div>)}{!keepers.length&&<p>No tracked keeper events.</p>}</div></article>
    </div>
  </div>
}

export default function FranchiseDetail(){return <Providers><View/></Providers>}
