"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import type {PowerRanking} from "@/lib/powerRankings";
import type {LivePowerSnapshot} from "@/lib/livePowerRankings";

export function PowerRankingsPreview({fallback}:{fallback:PowerRanking[]}){
  const [live,setLive]=useState<LivePowerSnapshot|null>(null);
  useEffect(()=>{fetch("/api/power-rankings/live").then((response)=>response.json()).then((result)=>setLive(result.snapshot??null)).catch(()=>setLive(null));},[]);
  const rankings=(live?.rankings??fallback).slice(0,3);
  return <section className="homePowerPreview"><header><div><span className="eyebrow">{live?.modelLabel??"2026 preseason model"}</span><h2>Power Rankings</h2></div><Link href="/power-rankings">See all 10 teams →</Link></header><div>{rankings.map((team)=><Link href={`/franchises/${team.franchiseId}`} key={team.franchiseId}><span>#{team.rank}</span><div><b>{team.franchise}</b><small>{team.tier} · {team.strength.label}</small></div><strong>{team.score}</strong></Link>)}</div></section>;
}
