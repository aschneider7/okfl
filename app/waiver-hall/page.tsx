"use client";

import Link from "next/link";
import {useMemo,useState} from "react";
import {Page,Loading} from "@/components/Page";
import {useData} from "@/components/DataProvider";
import {buildWaiverHall} from "@/lib/leagueIntelligence";

export default function WaiverHall(){
  const {data}=useData();const [season,setSeason]=useState("all");const [franchise,setFranchise]=useState("all");const hall=useMemo(()=>data?buildWaiverHall(data):{claims:[],managers:[]},[data]);
  if(!data)return <Loading/>;const seasons=[...new Set(hall.claims.map((claim)=>claim.season))].sort((a,b)=>b-a);const claims=hall.claims.filter((claim)=>(season==="all"||claim.season===Number(season))&&(franchise==="all"||claim.franchiseId===franchise));const best=hall.claims[0];
  return <Page title="Waiver Wire Hall of Fame" subtitle="Measure who found real production after draft day—and which free-agent additions became keepers or champions.">
    <section className="intelHero waiverHero"><div><span className="eyebrow">Waivers + free agency · 2021–2025</span><h2>{best?`${best.player} is the gold standard.`:"The wire is waiting."}</h2><p>Claims earn value from OKFL points, starts, keeper conversion, and championship impact. Repeat add/drop cycles count once per player, team, and season.</p></div><div><span>Top acquisition</span><b>{best?.points.toFixed(1)??"—"}</b><small>{best?`${best.franchise} · ${best.season} · ${best.starts} starts`:"No qualifying claim"}</small></div></section>
    <section className="intelControls waiverControls"><label htmlFor="waiver-season">Season</label><select id="waiver-season" value={season} onChange={(event)=>setSeason(event.target.value)}><option value="all">All seasons</option>{seasons.map((year)=><option value={year} key={year}>{year}</option>)}</select><label htmlFor="waiver-team">Franchise</label><select id="waiver-team" value={franchise} onChange={(event)=>setFranchise(event.target.value)}><option value="all">All franchises</option>{data.franchises.map((team)=><option value={team.id} key={team.id}>{team.name}</option>)}</select><p>{claims.length} distinct acquisitions</p></section>
    <section className="waiverManagers"><div className="sectionTitle"><div><span className="eyebrow">Front-office leaderboard</span><h2>Who works the wire best?</h2></div><span>Career production from post-draft additions</span></div><div>{hall.managers.map((manager,index)=><Link href={`/franchises/${manager.franchiseId}`} key={manager.franchiseId}><span>#{index+1}</span><div><b>{manager.franchise}</b><small>{manager.hits} 100-point hits · {manager.keepers} future keepers</small></div><strong>{manager.points.toFixed(1)}</strong><em>{manager.bestClaim}</em></Link>)}</div></section>
    <section className="waiverTable"><header><span>HOF RK</span><span>ACQUISITION</span><span>TEAM</span><span>TYPE</span><span>POINTS</span><span>STARTS</span><span>LEGACY</span></header>{claims.slice(0,50).map((claim,index)=><article key={`${claim.id}-${claim.player}-${claim.franchiseId}`}><span>{index+1}</span><div><b>{claim.player}</b><small>{claim.position||"Player"} · {claim.season} · {claim.date}</small></div><Link href={`/franchises/${claim.franchiseId}`}>{claim.franchise}</Link><span>{claim.type}</span><strong>{claim.points.toFixed(1)}</strong><span>{claim.starts}</span><div className="waiverBadges">{claim.kept&&<i>Keeper</i>}{claim.champion&&<i>Champion</i>}{!claim.kept&&!claim.champion&&<small>Production</small>}</div></article>)}</section>
    <p className="intelMethod">Historical points reflect production recorded for that franchise during the claim season. The score does not pretend to isolate points earned before versus after a midseason reacquisition.</p>
  </Page>;
}
