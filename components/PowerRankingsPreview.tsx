"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import type {PowerRanking} from "@/lib/powerRankings";
import type {LivePowerSnapshot} from "@/lib/livePowerRankings";

export function PowerRankingsPreview({fallback,variant="default"}:{fallback:PowerRanking[];variant?:"default"|"home9"}){
  const [live,setLive]=useState<LivePowerSnapshot|null>(null);
  useEffect(()=>{fetch("/api/power-rankings/live").then((response)=>response.json()).then((result)=>setLive(result.snapshot??null)).catch(()=>setLive(null));},[]);
  const rankings=(live?.rankings??fallback).slice(0,3);

  if(variant==="home9")return <article className="home9PowerCard">
    <header><div><span>{live?.modelLabel??"2026 preseason model"}</span><h3>Power podium</h3></div><Link href="/power-rankings">All 10 →</Link></header>
    <div>{rankings.map((team,index)=><Link href={`/franchises/${team.franchiseId}`} key={team.franchiseId}>
      <i>0{index+1}</i><div><b>{team.franchise}</b><small>{team.tier} · {team.strength.label}</small></div><strong>{team.score}</strong>
    </Link>)}</div>
    <footer><span>Model combines recent scoring, wins, finishes, weekly ceiling, development, and legacy.</span></footer>
  </article>;

  return <section className="homePowerPreview"><header><div><span className="eyebrow">{live?.modelLabel??"2026 preseason model"}</span><h2>Power Rankings</h2></div><Link href="/power-rankings">See all 10 teams →</Link></header><div>{rankings.map((team)=><Link href={`/franchises/${team.franchiseId}`} key={team.franchiseId}><span>#{team.rank}</span><div><b>{team.franchise}</b><small>{team.tier} · {team.strength.label}</small></div><strong>{team.score}</strong></Link>)}</div></section>;
}
