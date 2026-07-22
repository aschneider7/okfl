"use client";

import Link from "next/link";
import {useMemo} from "react";
import {Page,Loading} from "@/components/Page";
import {useData} from "@/components/DataProvider";
import {useLeagueDashboard} from "@/components/useLeagueDashboard";
import {simulatePlayoffOdds} from "@/lib/liveLeague";
import {buildClinchingScenarios} from "@/lib/leagueIntelligence";

export default function ClinchingScenarios(){
  const {data}=useData();const {dashboard,loading}=useLeagueDashboard(data);
  const odds=useMemo(()=>simulatePlayoffOdds(dashboard,5000),[dashboard]);
  const scenarios=useMemo(()=>buildClinchingScenarios(dashboard,odds),[dashboard,odds]);
  if(!data||loading)return <Loading/>;
  if(!dashboard.available)return <Page title="Playoff Clinching Scenarios" subtitle="The live race activates after the first Sleeper sync."><section className="liveEmpty"><h2>Live standings required.</h2><Link href="/commissioner">Open Commissioner →</Link></section></Page>;
  const leader=scenarios[0],cutline=scenarios[5];const clinched=scenarios.filter((row)=>row.status==="Clinched"||row.status==="Bye clinched").length;
  return <Page title="Playoff Clinching Scenarios" subtitle="Mathematical floors, projected cut lines, and the clearest path to one of six postseason spots.">
    <section className="intelHero clinchHero"><div><span className="eyebrow">Through Week {dashboard.completedWeek} · {Math.max(0,14-dashboard.completedWeek)} regular-season weeks left</span><h2>{dashboard.completedWeek?`${leader?.franchise} controls the race.`:"Every path is still open."}</h2><p>Guaranteed statuses use win floors and ceilings. Projected paths add 5,000 schedule simulations and the live points tiebreaker.</p></div><div><span>Projected cut line</span><b>{cutline?.projectedCutoff.toFixed(1)??"—"}</b><small>{clinched} mathematically clinched</small></div></section>
    <section className="clinchLegend"><span><i className="secure"/>Clinched</span><span><i className="inside"/>Currently in</span><span><i className="chasing"/>Chasing</span><span><i className="out"/>Eliminated</span></section>
    <section className="clinchBoard"><header><span>RK</span><span>FRANCHISE / PATH</span><span>RECORD</span><span>MAX</span><span>PLAYOFF ODDS</span><span>STATUS</span></header>{scenarios.map((team)=><article key={team.franchiseId} className={team.status.toLowerCase().replaceAll(" ","-")}><span>{team.rank}</span><div><Link href={`/franchises/${team.franchiseId}`}>{team.franchise}</Link><p>{team.path}</p>{team.swingGames.length>0&&<small>{team.swingGames.join(" · ")}</small>}</div><strong>{team.record}</strong><span>{team.maxWins}</span><div className="intelMeter"><i><b style={{width:`${team.playoffOdds}%`}}/></i><strong>{team.playoffOdds.toFixed(1)}%</strong></div><em>{team.status}</em></article>)}</section>
    <p className="intelMethod">A tie at the boundary remains unresolved until points-for tiebreakers are final, so “clinched” and “eliminated” labels intentionally use conservative mathematics.</p>
  </Page>;
}
