"use client";

import {useEffect,useState} from "react";
import {useAuth} from "@/components/AuthProvider";

export function KeeperCommissionerPanel(){
  const {authFetch}=useAuth();const [data,setData]=useState<any>(null);const [deadline,setDeadline]=useState("");const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
  async function load(){const response=await authFetch("/api/commissioner/keepers",{cache:"no-store"});const body=await response.json();if(!response.ok){setMessage(body.error||"Could not load keeper board.");return}setData(body);if(body.window?.deadline){const date=new Date(body.window.deadline);setDeadline(new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16))}}
  useEffect(()=>{void load()},[]);
  async function act(action:"deadline"|"lock"|"unlock"){
    setBusy(true);setMessage(action==="lock"?"Validating all ten franchises…":"Updating keeper controls…");
    try{const response=await authFetch("/api/commissioner/keepers",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,deadline:action==="deadline"&&deadline?new Date(deadline).toISOString():null})});const body=await response.json();if(!response.ok){setMessage(body.error||"Keeper control update failed.");return}setData(body);setMessage(action==="lock"?"Final keeper board locked and ready for the live draft.":action==="unlock"?"Keeper board reopened.":"Keeper deadline updated.")}
    catch{setMessage("Keeper control update failed.")}finally{setBusy(false)}
  }
  if(!data)return <section className="commissionerKeeper card"><div className="keeperSubmitLoading">Loading official keeper control room…</div>{message&&<p>{message}</p>}</section>;
  const locked=data.window.status==="locked";
  return <section className="commissionerKeeper"><header><div><span className="eyebrow">Official keeper control room</span><h2>2026 submission board</h2><p>Track every franchise, review cost conflicts, and lock the exact board used by the live draft.</p></div><span className={`keeperState ${locked?"locked":"open"}`}>{locked?"Final board locked":"Submissions open"}</span></header>
    <div className="keeperControlStats"><article><b>{data.summary.submitted.length}</b><span>Submitted teams</span></article><article><b>{data.summary.missing.length}</b><span>Missing teams</span></article><article className={data.summary.invalid.length?"warning":""}><b>{data.summary.invalid.length}</b><span>Invalid costs</span></article><article className={data.summary.changed.length?"changed":""}><b>{data.summary.changed.length}</b><span>Changed after submit</span></article></div>
    <div className="keeperCommissionerActions"><label><span>Keeper deadline</span><input type="datetime-local" value={deadline} onChange={(event)=>setDeadline(event.target.value)} disabled={locked}/></label><button className="secondaryButton" onClick={()=>act("deadline")} disabled={busy||locked}>Save deadline</button>{locked?<button onClick={()=>act("unlock")} disabled={busy}>Reopen board</button>:<button onClick={()=>act("lock")} disabled={busy||data.summary.missing.length>0||data.summary.invalid.length>0}>Lock final board</button>}</div>
    {message&&<p className="keeperSubmitMessage" role="status">{message}</p>}
    <div className="keeperTeamReview">{data.teams.map((team:any)=><article key={team.franchiseId} className={`${team.status} ${team.issues.length?"invalid":""}`}><header><div><span>{team.franchiseId} · @{team.username}</span><h3>{team.franchiseName}</h3><small>{team.manager}</small></div><b>{team.status}</b></header><div className="keeperReviewChoices">{team.choices.length?team.choices.map((choice:any,index:number)=><div key={`${choice.player}-${index}`}><span>0{index+1}</span><b>{choice.player||"Player missing"}</b><small>{choice.position||"—"} · {choice.round?`Round ${choice.round}`:"Cost missing"}</small></div>):<p>No keeper draft saved.</p>}</div>{team.issues.length>0&&<ul>{team.issues.map((issue:any,index:number)=><li key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul>}<footer><span>{team.submittedAt?`Submitted ${new Date(team.submittedAt).toLocaleString()}`:"Awaiting submission"}</span>{team.changedAfterSubmission&&<em>Changed after submission</em>}</footer></article>)}</div>
  </section>;
}
