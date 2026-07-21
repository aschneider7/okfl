"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {useAuth} from "@/components/AuthProvider";
import {KEEPERS_PER_TEAM,type KeeperChoice} from "@/lib/keeperSubmission";

const emptyChoice=():KeeperChoice=>({player:"",position:"",round:0});
const threeRows=(rows:KeeperChoice[]=[])=>Array.from({length:KEEPERS_PER_TEAM},(_,index)=>rows[index]||emptyChoice());

export function KeeperSubmissionPanel(){
  const {account,loading,authFetch}=useAuth();
  const [data,setData]=useState<any>(null);const [choices,setChoices]=useState<KeeperChoice[]>(threeRows());
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [confirmed,setConfirmed]=useState(false);

  useEffect(()=>{
    if(loading||!account)return;
    authFetch("/api/keepers/submission",{cache:"no-store"}).then(async(response)=>({ok:response.ok,body:await response.json()})).then(({ok,body})=>{
      if(!ok){setMessage(body.error||"Could not load keeper submission.");return}
      setData(body);
      const saved=body.submission?.choices||[];
      const certified=(body.eligibility||[]).slice(0,KEEPERS_PER_TEAM).map((row:any)=>({player:row.player,position:row.position,round:Number(row.round)}));
      setChoices(threeRows(saved.length?saved:certified));
    }).catch(()=>setMessage("Could not load keeper submission."));
  },[account,authFetch,loading]);

  const eligibility=data?.eligibility||[];
  const deadline=data?.window?.deadline?new Date(data.window.deadline):null;
  const expired=Boolean(deadline&&deadline.getTime()<=Date.now());
  const locked=data?.window?.status==="locked";

  function update(index:number,patch:Partial<KeeperChoice>){setConfirmed(false);setChoices((current)=>current.map((choice,row)=>row===index?{...choice,...patch}:choice))}
  function applyPlayer(index:number,name:string){const player=eligibility.find((row:any)=>row.player===name);update(index,player?{player:player.player,position:player.position,round:Number(player.round)}:emptyChoice())}
  async function save(action:"save"|"submit"){
    if(action==="submit"&&!confirmed){setMessage("Confirm the keeper costs before submitting.");return}
    setBusy(true);setMessage(action==="submit"?"Submitting official keepers…":"Saving draft…");
    try{const response=await authFetch("/api/keepers/submission",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,choices})});const body=await response.json();if(!response.ok){setMessage(body.issues?.map((issue:any)=>issue.message).join(" ")||body.error||"Keeper update failed.");return}setData(body);setChoices(threeRows(body.submission?.choices||choices));setConfirmed(false);setMessage(action==="submit"?"Official keeper submission received.":"Keeper draft saved.")}
    catch{setMessage("Keeper update failed.")}finally{setBusy(false)}
  }

  if(loading)return <section className="keeperSubmitShell card"><div className="keeperSubmitLoading">Checking franchise access…</div></section>;
  if(!account)return <section className="keeperSubmitShell keeperGate"><div><span className="eyebrow">Official 2026 keeper submission</span><h2>Your franchise. Your decision.</h2><p>Sign in to select three keepers, confirm their round costs, and submit them directly to the commissioner.</p></div><Link href="/login?next=/keepers">Sign in to submit</Link></section>;
  if(account.mustChangePassword)return <section className="keeperSubmitShell keeperGate"><div><span className="eyebrow">Account setup required</span><h2>Create your private password first.</h2><p>Keeper submissions unlock after your required first-login password change.</p></div><Link href="/account/change-password?next=/keepers">Create password</Link></section>;

  if(locked){
    const groups=new Map<string,any[]>();(data?.officialBoard||[]).forEach((row:any)=>groups.set(row.franchise_id,[...(groups.get(row.franchise_id)||[]),...(row.choices||[])]));
    return <section className="keeperSubmitShell keeperLocked"><header><div><span className="eyebrow">Final official board</span><h2>2026 keepers are locked.</h2><p>The live draft will load this board automatically. No further manager changes are allowed.</p></div><span className="keeperState locked">Locked</span></header><div className="officialKeeperGrid">{[...groups.entries()].map(([franchiseId,rows])=><article key={franchiseId}><span>{franchiseId}</span>{rows.map((choice,index)=><div key={`${choice.player}-${index}`}><b>{choice.player}</b><small>{choice.position} · Round {choice.round}</small></div>)}</article>)}</div></section>;
  }

  return <section className="keeperSubmitShell"><header className="keeperSubmitHead"><div><span className="eyebrow">Official 2026 keeper submission</span><h2>{account.franchiseName} · {account.displayName}</h2><p>Choose from the commissioner-certified eligibility ledger. Roster, cost, and required-pick checks are enforced again by the server.</p></div><div className="keeperDeadline"><span>{deadline?"Submission deadline":"Deadline"}</span><b>{deadline?deadline.toLocaleString([], {dateStyle:"medium",timeStyle:"short"}):"Not set"}</b><em>{expired?"Closed":data?.submission?.status==="submitted"?"Submitted":"Open"}</em></div></header>
    {data?.submission?.changed_after_submission&&<div className="keeperChangeNotice">This franchise has changes after its first submission. Submit again to make the latest choices official.</div>}
    <div className="keeperChoiceList">{choices.map((choice,index)=><article key={index}><span className="keeperChoiceNumber">0{index+1}</span><label><span>Certified player</span><select value={choice.player} onChange={(event)=>applyPlayer(index,event.target.value)} disabled={expired}><option value="">Choose player</option>{eligibility.map((row:any)=><option key={row.player_key} value={row.player}>{row.player}</option>)}</select></label><label><span>Position</span><input value={choice.position||"—"} readOnly aria-label={`Keeper ${index+1} certified position`}/></label><label><span>Certified cost</span><input value={choice.round?`Round ${choice.round}`:"—"} readOnly aria-label={`Keeper ${index+1} certified round cost`}/></label></article>)}</div>
    <footer className="keeperSubmitFooter"><label className="keeperConfirm"><input type="checkbox" checked={confirmed} onChange={(event)=>setConfirmed(event.target.checked)} disabled={expired}/><span>I confirm these three players and round costs are correct.</span></label><div><button className="secondaryButton" onClick={()=>save("save")} disabled={busy||expired}>Save draft</button><button onClick={()=>save("submit")} disabled={busy||expired||!confirmed}>{busy?"Working…":data?.submission?.submitted_at?"Confirm updated submission":"Submit official keepers"}</button></div></footer>
    {message&&<p className="keeperSubmitMessage" role="status">{message}</p>}
  </section>;
}
