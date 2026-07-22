"use client";

import Link from "next/link";
import {useMemo,useState} from "react";
import {Page,Loading} from "@/components/Page";
import {useData} from "@/components/DataProvider";
import {useLeagueDashboard} from "@/components/useLeagueDashboard";
import {archiveLuckGames,buildLuckIndex,liveLuckGames} from "@/lib/leagueIntelligence";

export default function LuckIndex(){
  const {data}=useData();const {dashboard,loading}=useLeagueDashboard(data);const [season,setSeason]=useState(2025);
  const liveGames=useMemo(()=>liveLuckGames(dashboard),[dashboard]);
  const seasons=useMemo(()=>{
    const archived=data?[...new Set<number>((data.weekly_games??[]).map((row:any)=>Number(row.season)))].sort((a,b)=>b-a):[];
    return liveGames.length&&!archived.includes(2026)?[2026,...archived]:archived;
  },[data,liveGames.length]);
  const games=useMemo(()=>!data?[]:season===2026?liveGames:archiveLuckGames(data,season),[data,season,liveGames]);
  const rows=useMemo(()=>data?buildLuckIndex(games,data.franchises):[],[data,games]);
  if(!data||loading)return <Loading/>;const lucky=rows[0],unlucky=rows.at(-1);
  return <Page title="Luck Index" subtitle="Separate team quality from schedule fortune with all-play records, expected wins, close-game results, and opponent scoring.">
    <section className="intelHero luckHero"><div><span className="eyebrow">Schedule audit · {season}</span><h2>{lucky?`${lucky.franchise} caught the most breaks.`:"No completed games yet."}</h2><p>Expected wins compare each weekly score against all nine possible opponents. Luck wins are actual wins minus that schedule-neutral expectation.</p></div><div><span>Luck leader</span><b>{lucky?`${lucky.luckWins>=0?"+":""}${lucky.luckWins.toFixed(2)}`:"—"}</b><small>{unlucky?`${unlucky.franchise} sits at ${unlucky.luckWins.toFixed(2)}`:"Select a completed season"}</small></div></section>
    <section className="intelControls"><label htmlFor="luck-season">Season</label><select id="luck-season" value={season} onChange={(event)=>setSeason(Number(event.target.value))}>{seasons.map((year)=><option value={year} key={year}>{year}{year===2026?" · Live":""}</option>)}</select><p>{games.length} team performances measured across {new Set(games.map((game)=>game.week)).size} weeks.</p></section>
    {rows.length?<section className="luckTable"><header><span>LUCK RK</span><span>FRANCHISE</span><span>ACTUAL W</span><span>EXPECTED W</span><span>LUCK WINS</span><span>ALL-PLAY</span><span>SCHEDULE</span><span>CLOSE</span></header>{rows.map((team,index)=><article key={team.franchiseId}><span>{index+1}</span><div><Link href={`/franchises/${team.franchiseId}`}>{team.franchise}</Link><small>{team.pointsFor.toFixed(1)} PF · {team.pointsAgainst.toFixed(1)} PA</small></div><strong>{team.actualWins.toFixed(1)}</strong><span>{team.expectedWins.toFixed(2)}</span><em className={team.luckWins>=0?"positive":"negative"}>{team.luckWins>=0?"+":""}{team.luckWins.toFixed(2)}</em><span>{team.allPlayWins}-{team.allPlayLosses}{team.allPlayTies?`-${team.allPlayTies}`:""}</span><span>#{team.scheduleRank} hardest</span><span>{team.closeWins}-{team.closeLosses}</span></article>)}</section>:<section className="intelEmpty"><h2>The 2026 luck ledger opens after Week 1.</h2><p>Choose an archived season above or sync completed Sleeper matchups.</p></section>}
    <div className="intelExplainers"><article><span>Expected wins</span><p>A weekly score that beats six of nine opponents earns 0.67 expected wins, regardless of the scheduled opponent.</p></article><article><span>Schedule rank</span><p>Average opponent points. Number one faced the league’s most difficult scoring schedule.</p></article><article><span>Close record</span><p>Wins and losses decided by ten points or fewer—the highest-variance part of the schedule.</p></article></div>
  </Page>;
}
