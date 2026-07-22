"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useData} from "@/components/DataProvider";
import {useLeagueDashboard} from "@/components/useLeagueDashboard";
import {useAwardsRace} from "@/components/useAwardsRace";
import {useAuth} from "@/components/AuthProvider";
import {RecapArticle} from "@/components/RecapArticle";
import {generateCommissionerRecap,type CommissionerRecap} from "@/lib/commissionerRecap";

export function CommissionerRecapEditor(){
  const {data}=useData(),{dashboard,loading,power}=useLeagueDashboard(data),{awards,loading:awardsLoading}=useAwardsRace(),{authFetch}=useAuth();
  const [week,setWeek]=useState(1),[recap,setRecap]=useState<CommissionerRecap|null>(null),[busy,setBusy]=useState(""),[message,setMessage]=useState(""),[migration,setMigration]=useState(false);
  useEffect(()=>{if(dashboard.completedWeek&&!recap)setWeek(dashboard.completedWeek)},[dashboard.completedWeek,recap]);
  useEffect(()=>{if(!dashboard.completedWeek)return;let active=true;setBusy("load");authFetch(`/api/commissioner/recaps?week=${week}`,{cache:"no-store"}).then(async response=>({response,body:await response.json()})).then(({response,body})=>{if(!active)return;setMigration(Boolean(body.migrationRequired));if(response.ok&&body.recaps?.[0])setRecap(body.recaps[0]);else if(response.ok)setRecap(generateCommissionerRecap(dashboard,awards,power,week));else setMessage(body.error||"Could not load this edition.")}).finally(()=>active&&setBusy(""));return()=>{active=false}},[week,dashboard.completedWeek,authFetch]);
  if(!data||loading||awardsLoading)return <div className="card loadingCard"><span/>Opening the recap desk…</div>;
  if(!dashboard.completedWeek)return <section className="accountGate card"><h1>The recap desk opens after Week 1.</h1><Link href="/commissioner">Return to Commissioner OS</Link></section>;
  if(migration)return <section className="settingsMigration card"><span className="eyebrow">One-time database step</span><h1>Activate Commissioner Recaps</h1><p>{message}</p><code>supabase/014_commissioner_recaps.sql</code><button onClick={()=>location.reload()}>Check again</button></section>;
  const update=(key:keyof CommissionerRecap,value:any)=>setRecap(current=>current?{...current,[key]:value}:current);
  const save=async(action:"save"|"publish"|"unpublish")=>{if(!recap)return;setBusy(action);setMessage("");const response=await authFetch("/api/commissioner/recaps",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,recap})}),body=await response.json();setBusy("");if(response.ok){setRecap(body.recap);setMessage(action==="publish"?"Published. Every manager can now read this edition.":action==="unpublish"?"Moved back to drafts.":"Draft saved.")}else{setMigration(Boolean(body.migrationRequired));setMessage(body.error||"Could not save recap.")}};
  return <div className="recapStudio"><header className="recapStudioHero"><div><span className="eyebrow">Commissioner newsroom</span><h1>Write the week into league history.</h1><p>Start from verified Sleeper results, rewrite anything you want, preview the article, then publish when it sounds like you.</p></div><Link href="/weekly-recap">Public recap →</Link></header>
    <div className="recapStudioBar"><label>Edition<select value={week} onChange={event=>{setRecap(null);setWeek(Number(event.target.value))}}>{Array.from({length:dashboard.completedWeek},(_,i)=>i+1).reverse().map(value=><option key={value} value={value}>Week {value}</option>)}</select></label><button className="secondary" onClick={()=>setRecap(generateCommissionerRecap(dashboard,awards,power,week))}>Regenerate from results</button><span className={recap?.status==="published"?"published":"draft"}>{recap?.status||"draft"}</span></div>
    {message&&<div className="recapStudioMessage" role="status">{message}</div>}
    {recap&&<div className="recapStudioLayout"><section className="recapEditor"><label>Headline<input value={recap.headline} onChange={e=>update("headline",e.target.value)} maxLength={180}/></label><label>Opening deck<textarea value={recap.dek} onChange={e=>update("dek",e.target.value)} rows={3}/></label><label>Commissioner quote<textarea value={recap.quote} onChange={e=>update("quote",e.target.value)} rows={3}/></label>{recap.sections.map((section,index)=><fieldset key={section.key}><label>Section label<input value={section.label} onChange={e=>update("sections",recap.sections.map((row,i)=>i===index?{...row,label:e.target.value}:row))}/></label><label>Story copy<textarea value={section.body} rows={7} onChange={e=>update("sections",recap.sections.map((row,i)=>i===index?{...row,body:e.target.value}:row))}/></label></fieldset>)}<div className="recapPublishActions"><button disabled={Boolean(busy)} className="secondary" onClick={()=>save("save")}>{busy==="save"?"Saving…":"Save draft"}</button>{recap.status==="published"?<button disabled={Boolean(busy)} onClick={()=>save("unpublish")}>Unpublish</button>:<button disabled={Boolean(busy)} onClick={()=>save("publish")}>{busy==="publish"?"Publishing…":"Publish Week "+week}</button>}</div></section><RecapArticle recap={recap} preview/></div>}
  </div>;
}
