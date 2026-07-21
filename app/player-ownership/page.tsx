"use client";

import {useMemo,useState} from "react";
import {Page,Loading} from "@/components/Page";
import {useData} from "@/components/DataProvider";
import {buildOwnershipIndex,findOwnershipPlayer} from "@/lib/leagueIntelligence";

export default function PlayerOwnership(){
  const {data}=useData();const [query,setQuery]=useState("");const [selectedName,setSelectedName]=useState("");
  const players=useMemo(()=>data?buildOwnershipIndex(data):[],[data]);const selected=findOwnershipPlayer(players,selectedName||query)||players[0];
  const results=useMemo(()=>{const term=query.trim().toLowerCase();return (term?players.filter((player)=>player.name.toLowerCase().includes(term)):players).slice(0,12)},[players,query]);
  if(!data)return <Loading/>;
  return <Page title="Player Ownership Genealogy" subtitle="Trace every drafted, kept, traded, claimed, dropped, and rostered stop in a player’s OKFL history.">
    <section className="intelHero ownershipHero"><div><span className="eyebrow">640-player historical registry</span><h2>Every player leaves a paper trail.</h2><p>Search the archive to reconstruct the path from draft day through trades, waivers, keeper seasons, and championship rosters.</p></div><div><span>Most traveled</span><b>{players[0]?.ownerCount??0}</b><small>{players[0]?.name??"No player"} · unique franchises</small></div></section>
    <section className="ownershipSearch"><label htmlFor="ownership-player">Find a player</label><input id="ownership-player" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search player name…"/><span>{results.length} shown</span></section>
    <div className="ownershipLayout"><aside className="ownershipResults">{results.map((player)=><button type="button" className={selected?.name===player.name?"active":""} key={player.name} onClick={()=>{setSelectedName(player.name);setQuery(player.name)}}><div><b>{player.name}</b><small>{player.positions.join("/")||"Player"} · last with {player.lastFranchise}</small></div><span>{player.ownerCount}<small>owners</small></span></button>)}</aside>
      {selected?<section className="ownershipProfile"><header><div><span className="eyebrow">Ownership file</span><h2>{selected.name}</h2><p>{selected.positions.join("/")||"Player"} · tracked from {selected.seasons[0]} to {selected.seasons.at(-1)}</p></div>{selected.pfrUrl&&<a href={selected.pfrUrl} target="_blank" rel="noreferrer">Player reference ↗</a>}</header><div className="ownershipStats"><article><b>{selected.ownerCount}</b><span>Unique franchises</span></article><article><b>{selected.moveCount}</b><span>Recorded moves</span></article><article><b>{selected.seasons.length}</b><span>Tracked seasons</span></article><article><b>{selected.championships}</b><span>Titles</span></article></div><div className="ownershipTimeline">{selected.events.map((event,index)=><article className={event.direction} key={`${event.season}-${event.type}-${event.franchiseId}-${index}`}><span>{event.season}</span><i/><div><small>{event.type}</small><b>{event.franchise}</b><p>{event.detail||"Recorded ownership event"}</p></div></article>)}</div></section>:<section className="intelEmpty"><h2>No matching player.</h2><p>Try a shorter first or last name.</p></section>}
    </div>
  </Page>;
}
