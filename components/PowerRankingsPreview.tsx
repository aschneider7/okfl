"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import type {PowerRanking} from "@/lib/powerRankings";
import type {LivePowerSnapshot} from "@/lib/livePowerRankings";

export function PowerRankingsPreview({fallback,variant="default",autoRefresh=true}:{fallback:PowerRanking[];variant?:"default"|"home9"|"homeCalm";autoRefresh?:boolean}){
  const [live,setLive]=useState<LivePowerSnapshot|null>(null);
  useEffect(()=>{
    if(!autoRefresh)return;
    let active=true;
    const refresh=()=>fetch("/api/power-rankings/live",{cache:"no-store"}).then((response)=>response.json()).then((result)=>{if(active)setLive(result.snapshot??null)}).catch(()=>{});
    const onVisible=()=>{if(document.visibilityState==="visible")void refresh()};
    void refresh();
    const timer=window.setInterval(()=>void refresh(),5*60*1000);
    window.addEventListener("focus",refresh);
    document.addEventListener("visibilitychange",onVisible);
    return()=>{active=false;window.clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",onVisible)};
  },[autoRefresh]);
  const rankings=(live?.rankings??fallback).slice(0,3);

  if(variant==="homeCalm")return <article className="homeCalmPower">
    <header><div><span>{live?.modelLabel??"2026 preseason model"}</span><h3>Power rankings</h3></div><Link href="/power-rankings">All 10 →</Link></header>
    <div>{rankings.map((team,index)=><Link href={`/franchises/${team.franchiseId}`} key={team.franchiseId}>
      <i>{String(index+1).padStart(2,"0")}</i><div><b>{team.franchise}</b><small>{team.tier} · {team.strength.label}</small></div><strong>{team.score}</strong>
    </Link>)}</div>
    <footer>Updated from the same model used throughout the league dashboard.</footer>
  </article>;

  if(variant==="home9")return <article className="home9PowerCard">
    <header><div><span>{live?.modelLabel??"2026 preseason model"}</span><h3>Power podium</h3></div><Link href="/power-rankings">All 10 →</Link></header>
    <div>{rankings.map((team,index)=><Link href={`/franchises/${team.franchiseId}`} key={team.franchiseId}>
      <i>0{index+1}</i><div><b>{team.franchise}</b><small>{team.tier} · {team.strength.label}</small></div><strong>{team.score}</strong>
    </Link>)}</div>
    <footer><span>Model combines recent scoring, wins, finishes, weekly ceiling, development, and legacy.</span></footer>
  </article>;

  return <section className="homePowerPreview"><header><div><span className="eyebrow">{live?.modelLabel??"2026 preseason model"}</span><h2>Power Rankings</h2></div><Link href="/power-rankings">See all 10 teams →</Link></header><div>{rankings.map((team)=><Link href={`/franchises/${team.franchiseId}`} key={team.franchiseId}><span>#{team.rank}</span><div><b>{team.franchise}</b><small>{team.tier} · {team.strength.label}</small></div><strong>{team.score}</strong></Link>)}</div></section>;
}
