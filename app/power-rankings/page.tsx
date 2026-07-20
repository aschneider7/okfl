"use client";

import Link from "next/link";
import Providers from "../providers";
import {Loading,Page} from "@/components/Page";
import {useData} from "@/components/DataProvider";
import {buildPowerRankings} from "@/lib/powerRankings";
import "./power-rankings.css";

function Movement({value}:{value:number}){return <span className={`powerMove ${value>0?"up":value<0?"down":"even"}`}>{value>0?`↑ ${value}`:value<0?`↓ ${Math.abs(value)}`:"—"}</span>}

function View(){
  const {data}=useData(); if(!data)return <Loading/>;
  const rankings=buildPowerRankings(data); const leader=rankings[0];
  return <Page title="2026 Power Rankings" subtitle="A transparent preseason model built from recent performance, scoring force, roster development, and proven results.">
    <section className="powerHero"><div><span className="eyebrow">OKFL Power Index · Preseason edition</span><h2>{leader.franchise} opens at No. 1.</h2><p>{leader.summary}</p><div><span>Power score <b>{leader.score}</b></span><span>Top trait <b>{leader.strength.label}</b></span><span>2025 record <b>{leader.record}</b></span></div></div><strong>#1</strong></section>
    <section className="powerMethod"><span>Model weights</span>{[{label:"Recent scoring",value:30},{label:"Recent wins",value:20},{label:"Final finishes",value:15},{label:"Weekly force",value:15},{label:"Development",value:10},{label:"Résumé",value:10}].map((item)=><div key={item.label}><b>{item.value}%</b><small>{item.label}</small></div>)}</section>
    <div className="powerLayout"><section className="powerList">{rankings.map((team)=>
      <article className={team.rank<=3?`powerTeam top-${team.rank}`:"powerTeam"} key={team.franchiseId}>
        <div className="powerRank"><span>Rank</span><b>{team.rank}</b><Movement value={team.movement}/></div>
        <div className="powerTeamMain"><header><div><span>{team.tier}</span><h2>{team.franchise}</h2><p>{team.manager} · {team.record} in 2025 · previously #{team.previousRank}</p></div><strong>{team.score}</strong></header><p>{team.summary}</p><div className="powerBars">{team.dimensions.map((dimension)=><div key={dimension.key} title={dimension.detail}><span>{dimension.label}</span><i><b style={{width:`${dimension.score}%`}}/></i><strong>{dimension.score}</strong></div>)}</div><footer><div><span>Why they can rise</span><b>{team.strength.label}</b><small>{team.strength.detail}</small></div><div><span>Pressure point</span><b>{team.concern.label}</b><small>{team.concern.detail}</small></div><Link href={`/franchises/${team.franchiseId}`}>Open profile →</Link></footer></div>
      </article>)}</section>
      <aside className="powerRail"><section><span className="eyebrow">Biggest climbers</span><h2>Momentum board</h2>{rankings.slice().sort((a,b)=>b.movement-a.movement).slice(0,4).map((team)=><div key={team.franchiseId}><b>{team.franchise}</b><Movement value={team.movement}/></div>)}</section><section><span className="eyebrow">How to read it</span><h2>Power, not legacy</h2><p>Recent seasons carry 80% of the model. Historical résumé and roster development provide context without allowing old championships to dominate current form.</p></section></aside>
    </div>
  </Page>;
}
export default function PowerRankings(){return <Providers><View/></Providers>}
