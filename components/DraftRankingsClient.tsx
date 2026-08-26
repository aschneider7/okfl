"use client";

import Link from "next/link";
import {useCallback,useEffect,useMemo,useState} from "react";
import {useAuth} from "@/components/AuthProvider";
import {draftPlayerKey} from "@/lib/draftRankings";
import type {DraftPlayer} from "@/lib/draftSimulator";

type RankingsPayload={players:DraftPlayer[];keys:string[];saved:boolean;updatedAt:string|null;meta:any;error?:string};

export function DraftRankingsClient(){
  const {account,loading:authLoading,authFetch}=useAuth();
  const [data,setData]=useState<RankingsPayload|null>(null);const [live,setLive]=useState<any>(null);
  const [query,setQuery]=useState("");const [position,setPosition]=useState("ALL");const [busy,setBusy]=useState(false);const [dirty,setDirty]=useState(false);const [message,setMessage]=useState("");
  const load=useCallback(async()=>{
    const response=await authFetch("/api/draft/personal-rankings",{cache:"no-store"});const body=await response.json();
    if(!response.ok){setMessage(body.error||"Could not load your board.");return}setData(body);setDirty(false);
  },[authFetch]);
  const loadLive=useCallback(()=>fetch("/api/sleeper/draft-live",{cache:"no-store"}).then((response)=>response.json()).then(setLive).catch(()=>setLive({connected:false})),[]);
  useEffect(()=>{if(account&&!account.mustChangePassword)void load()},[account,load]);
  useEffect(()=>{void loadLive();const timer=window.setInterval(loadLive,12000);return()=>window.clearInterval(timer)},[loadLive]);

  const drafted=new Set((live?.picks||[]).map((pick:any)=>draftPlayerKey(pick.player||pick.metadata?.full_name||"")));
  const filtered=useMemo(()=>(data?.players||[]).filter((player)=>(position==="ALL"||player.position===position)&&(!query||player.name.toLowerCase().includes(query.toLowerCase()))),[data?.players,position,query]);
  function move(key:string,mode:"up"|"down"|"top"){
    if(!data)return;const index=data.players.findIndex((player)=>draftPlayerKey(player.name)===key);if(index<0)return;
    const target=mode==="top"?0:mode==="up"?Math.max(0,index-1):Math.min(data.players.length-1,index+1);if(target===index)return;
    const players=[...data.players];const [player]=players.splice(index,1);players.splice(target,0,player);setData({...data,players:players.map((row,rank)=>({...row,pprRank:rank+1})),keys:players.map((row)=>draftPlayerKey(row.name))});setDirty(true);
  }
  async function save(){if(!data)return;setBusy(true);setMessage("Saving your private board…");const response=await authFetch("/api/draft/personal-rankings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rankings:data.players.map((player)=>draftPlayerKey(player.name))})});const body=await response.json();setBusy(false);if(!response.ok){setMessage(body.error||"Save failed.");return}setDirty(false);setData({...data,saved:true,updatedAt:body.updatedAt});setMessage("Private board saved. The live room will use this order.")}
  async function reset(){setBusy(true);const response=await authFetch("/api/draft/personal-rankings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"reset"})});setBusy(false);if(!response.ok){setMessage("Could not reset the board.");return}await load();setMessage("Restored the OKFL market board.")}

  if(authLoading)return <div className="card loadingCard"><span/>Loading manager access…</div>;
  if(!account)return <section className="accountGate card"><span className="eyebrow">Private manager board</span><h2>Sign in to build your rankings.</h2><p>Every franchise gets a separate board that no other manager can see.</p><Link href="/login?next=/draft-rankings">Sign in</Link></section>;
  if(account.mustChangePassword)return <section className="accountGate card"><span className="eyebrow">Account setup</span><h2>Change your temporary password first.</h2><Link href="/account/change-password?next=/draft-rankings">Finish setup</Link></section>;
  return <div className="personalDraftSuite">
    <section className="personalDraftHero"><div><span>Private to {account.franchiseName}</span><h2>Your board. Your call.</h2><p>Move players into your exact order. Drafted players are removed in real time when the official Sleeper draft begins.</p></div><div className="personalDraftHeroStats"><article><b>{data?.players.length||0}</b><span>ranked players</span></article><article><b>{live?.picks?.length||0}<small>/{live?.expectedPicks||170}</small></b><span>Sleeper picks</span></article><article><b>{live?.draft?.status||"checking"}</b><span>draft status</span></article></div></section>
    <div className="personalDraftToolbar"><div><input aria-label="Search rankings" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search any player"/><div className="positionTabs">{["ALL","QB","RB","WR","TE","K","DEF"].map((value)=><button key={value} className={position===value?"active":""} onClick={()=>setPosition(value)}>{value}</button>)}</div></div><div><span className={dirty?"rankingState dirty":"rankingState"}>{dirty?"Unsaved changes":data?.saved?"Private board saved":"Using OKFL market order"}</span><button className="secondaryButton" disabled={busy} onClick={reset}>Reset</button><button disabled={busy||!dirty} onClick={save}>{busy?"Saving…":"Save board"}</button></div></div>
    {message&&<p className="personalDraftMessage" role="status">{message}</p>}
    <div className="personalDraftLayout"><section className="personalRankingList"><header><span>RK</span><span>Player</span><span>Market</span><span>Move</span></header>{filtered.map((player)=>{const key=draftPlayerKey(player.name);const overall=(data?.players||[]).findIndex((row)=>draftPlayerKey(row.name)===key)+1;const isDrafted=drafted.has(key);return <article key={key} className={isDrafted?"drafted":""}><strong>{overall}</strong><i className={`rankPos pos-${player.position.toLowerCase()}`}>{player.position}</i><div><b>{player.name}</b><small>{player.team} · {isDrafted?"Drafted on Sleeper":`PPR ADP ${player.marketAdp?.toFixed(1)||"—"}`}</small></div><em>{player.marketAdp?.toFixed(1)||player.pprRank}</em><nav><button title="Move to top" onClick={()=>move(key,"top")}>Top</button><button title="Move up" onClick={()=>move(key,"up")}>↑</button><button title="Move down" onClick={()=>move(key,"down")}>↓</button></nav></article>})}</section>
      <aside className="officialLiveBoard"><header><div><span className="eyebrow">Official Sleeper feed</span><h2>Live draft board</h2></div><i className={live?.connected?"online":"offline"}>{live?.connected?"Live · 12s":"Offline"}</i></header><div className="liveBoardScore"><b>{live?.picks?.length||0}</b><span>of {live?.expectedPicks||170} picks</span><em>{live?.mismatch?`OKFL has ${live.storedPicks} · sync needed`:"Sleeper and OKFL match"}</em></div><div className="officialPickFeed">{[...(live?.picks||[])].reverse().slice(0,30).map((pick:any)=><article key={`${pick.draft_id}-${pick.pick_no}`}><strong>{pick.pick_no}</strong><div><b>{pick.player}</b><small>{pick.position} · {pick.team||"FA"}</small></div><span>{pick.franchise||pick.franchise_id||`Slot ${pick.draft_slot}`}</span></article>)}{!live?.picks?.length&&<p>The board will populate automatically when the Sleeper draft starts.</p>}</div><footer><Link href="/live-draft">Open OKFL live room</Link><small>Last checked {live?.checkedAt?new Date(live.checkedAt).toLocaleTimeString():"—"}</small></footer></aside>
    </div>
  </div>;
}
