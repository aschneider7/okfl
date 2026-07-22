"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {Loading,Page} from "@/components/Page";
import {useData} from "@/components/DataProvider";
import {buildPowerRankings} from "@/lib/powerRankings";
import type {LivePowerSnapshot} from "@/lib/livePowerRankings";
import "./power-rankings.css";

function Movement({value}:{value:number}){return <span className={`powerMove ${value>0?"up":value<0?"down":"even"}`}>{value>0?`↑ ${value}`:value<0?`↓ ${Math.abs(value)}`:"—"}</span>}

function View(){
  const {data}=useData();
  const [live,setLive]=useState<LivePowerSnapshot|null>(null);
  useEffect(()=>{fetch("/api/power-rankings/live").then((response)=>response.json()).then((result)=>setLive(result.snapshot??null)).catch(()=>setLive(null));},[]);
  if(!data)return <Loading/>;
  const rankings=live?.rankings??buildPowerRankings(data); const leader=rankings[0];
  const weights=live?.weights??[{label:"Recent scoring",value:30},{label:"Recent wins",value:20},{label:"Final finishes",value:15},{label:"Weekly force",value:15},{label:"Development",value:10},{label:"Resume",value:10}];
  return <Page title="2026 Power Rankings" subtitle="Automatically recalculated after every Sleeper sync—from the post-draft roster check through each completed week.">
    <section className="powerHero"><div><span className="eyebrow">OKFL Power Index · {live?.modelLabel??"Preseason edition"}</span><h2>{leader.franchise} is No. 1.</h2><p>{leader.summary}</p><div><span>Power score <b>{leader.score}</b></span><span>Top trait <b>{leader.strength.label}</b></span><span>{live?.week?"2026 record":"Status"} <b>{leader.record}</b></span>{live?.syncedAt&&<span>Synced <b>{new Date(live.syncedAt).toLocaleDateString()}</b></span>}</div></div><strong>#1</strong></section>
    <section className="powerMethod"><span>Model weights</span>{weights.map((item)=><div key={item.label}><b>{item.value}%</b><small>{item.label}</small></div>)}</section>
    <div className="powerLayout"><section className="powerList">{rankings.map((team)=><article className={team.rank<=3?`powerTeam top-${team.rank}`:"powerTeam"} key={team.franchiseId}>
      <div className="powerRank"><span>Rank</span><b>{team.rank}</b><Movement value={team.movement}/></div>
      <div className="powerTeamMain"><header><div><span>{team.tier}</span><h2>{team.franchise}</h2><p>{team.manager} · {team.record} · previously #{team.previousRank}</p></div><strong>{team.score}</strong></header><p>{team.summary}</p><div className="powerBars">{team.dimensions.map((dimension)=><div key={dimension.key} title={dimension.detail}><span>{dimension.label}</span><i><b style={{width:`${dimension.score}%`}}/></i><strong>{dimension.score}</strong></div>)}</div><footer><div><span>Why they can rise</span><b>{team.strength.label}</b><small>{team.strength.detail}</small></div><div><span>Pressure point</span><b>{team.concern.label}</b><small>{team.concern.detail}</small></div><Link href={`/franchises/${team.franchiseId}`}>Open profile →</Link></footer></div>
    </article>)}</section>
      <aside className="powerRail"><section><span className="eyebrow">Biggest climbers</span><h2>Momentum board</h2>{rankings.slice().sort((a,b)=>b.movement-a.movement).slice(0,4).map((team)=><div key={team.franchiseId}><b>{team.franchise}</b><Movement value={team.movement}/></div>)}</section><section><span className="eyebrow">How it updates</span><h2>Sleeper drives the board</h2><p>After the draft, roster strength enters the model. Each completed week then adds scoring, win rate, and three-week form. Every sync saves a snapshot so movement remains meaningful.</p></section></aside>
    </div>
  </Page>;
}
export default function PowerRankings(){return <View/>}
