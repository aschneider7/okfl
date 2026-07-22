"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {useAuth} from "@/components/AuthProvider";
import {KeeperCommissionerPanel} from "@/components/KeeperCommissionerPanel";
import {CommissionerCommunications} from "@/components/CommissionerCommunications";

type Franchise={id:string;name:string;manager:string};

export function CommissionerDashboard() {
  const [status,setStatus]=useState<any>(null);
  const [repairs,setRepairs]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [syncing,setSyncing]=useState(false);
  const [savingKey,setSavingKey]=useState("");
  const [message,setMessage]=useState("");
  const [selections,setSelections]=useState<Record<string,string>>({});
  const [notes,setNotes]=useState<Record<string,string>>({});
  const router=useRouter();
  const {authFetch,signOut}=useAuth();

  async function load() {
    setLoading(true);
    const [statusResponse,repairResponse]=await Promise.all([
      authFetch("/api/sleeper/status",{cache:"no-store"}),
      authFetch("/api/commissioner/repairs",{cache:"no-store"}),
    ]);
    const [statusBody,repairBody]=await Promise.all([
      statusResponse.json(),
      repairResponse.json(),
    ]);
    setStatus(statusBody);
    setRepairs(repairBody);
    setLoading(false);
  }

  useEffect(()=>{load()},[]);

  async function sync() {
    setSyncing(true);
    setMessage("");
    const response=await authFetch("/api/sleeper/sync",{method:"POST"});
    const body=await response.json();
    setSyncing(false);
    setMessage(response.ok?`Sync completed at ${new Date(body.synced_at).toLocaleString()}`:body.error||"Sync failed");
    if(response.ok) load();
  }

  async function saveUser(user:any) {
    const key=`user-${user.user_id}`;
    const franchiseId=selections[key];
    if(!franchiseId){setMessage("Choose a franchise first.");return}
    setSavingKey(key);
    const response=await authFetch("/api/commissioner/repairs",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        type:"user",
        externalUserId:user.user_id,
        username:user.username,
        displayName:user.display_name,
        teamName:user.team_name,
        franchiseId,
        note:notes[key]||null,
      }),
    });
    const body=await response.json();
    setSavingKey("");
    setMessage(response.ok?`${user.username||user.display_name} assigned successfully.`:body.error||"Repair failed");
    if(response.ok)load();
  }

  async function saveRoster(roster:any) {
    const key=`roster-${roster.roster_id}`;
    const franchiseId=selections[key];
    if(!franchiseId){setMessage("Choose a franchise first.");return}
    setSavingKey(key);
    const response=await authFetch("/api/commissioner/repairs",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        type:"roster",
        rosterId:roster.roster_id,
        franchiseId,
        note:notes[key]||null,
      }),
    });
    const body=await response.json();
    setSavingKey("");
    setMessage(response.ok?`Roster ${roster.roster_id} assigned successfully.`:body.error||"Repair failed");
    if(response.ok)load();
  }

  async function logout() {
    await signOut();
    router.replace("/");
    router.refresh();
  }

  const snapshot=status?.snapshot;
  const history=status?.history??[];
  const franchises:Franchise[]=repairs?.franchises??[];
  const unresolvedUsers=snapshot?.integrity?.unresolved_users??[];
  const unresolvedRosters=snapshot?.integrity?.unresolved_rosters??[];
  const issueCount=unresolvedUsers.length+unresolvedRosters.length;

  const completedMappings=useMemo(
    ()=>repairs?.identity_aliases??[],
    [repairs]
  );

  function selector(key:string) {
    return (
      <>
        <select
          value={selections[key]||""}
          onChange={(event)=>setSelections((current)=>({...current,[key]:event.target.value}))}
        >
          <option value="">Choose permanent franchise</option>
          {franchises.map((franchise)=>(
            <option key={franchise.id} value={franchise.id}>
              {franchise.id} — {franchise.name} ({franchise.manager})
            </option>
          ))}
        </select>
        <input
          value={notes[key]||""}
          onChange={(event)=>setNotes((current)=>({...current,[key]:event.target.value}))}
          placeholder="Optional reason or note"
        />
      </>
    );
  }

  return (
    <div className="commissionerPage">
      <div className="pageHead commissionerHead">
        <div>
          <span className="eyebrow">Private commissioner tools</span>
          <h1>Commissioner OS</h1>
          <p>Sync Sleeper, repair unresolved identities, and keep a permanent audit trail.</p>
        </div>
        <button className="secondaryButton" onClick={logout}>Lock dashboard</button>
      </div>

      <nav className="commissionerNav" aria-label="Commissioner sections">
        <a href="#league-comms"><span>01</span>Communications</a>
        <a href="#keeper-operations"><span>02</span>Keeper board</a>
        <a href="#league-operations"><span>03</span>League health</a>
        <a href="#commissioner-records"><span>04</span>Records</a>
      </nav>

      <div className="commissionerActions commissionerOverview" id="league-operations">
        <article className="card syncCard">
          <div>
            <span className="eyebrow">Sleeper league</span>
            <h2>2026 Database Sync</h2>
            <p>League ID: 1381102523590389760</p>
          </div>
          <button onClick={sync} disabled={syncing}>
            {syncing?"Syncing all 18 weeks…":"Sync Sleeper Now"}
          </button>
          {message&&<div className="syncMessage">{message}</div>}
        </article>

        <article className="card">
          <span className="eyebrow">Database health</span>
          <h2>{issueCount?`${issueCount} issue${issueCount===1?"":"s"} need attention`:"No unresolved issues"}</h2>
          <p>Saved repairs are reused during every future sync.</p>
          <div className={`statusPill ${!issueCount&&snapshot?"success":""}`}>
            {!snapshot?"No sync data yet":issueCount?"Action required":"Healthy"}
          </div>
          {snapshot?.synced_at&&<small className="commissionerLastSync">Last synced {new Date(snapshot.synced_at).toLocaleString()}</small>}
        </article>
      </div>

      <div id="league-comms"><CommissionerCommunications /></div>

      <div id="keeper-operations"><KeeperCommissionerPanel /></div>

      {loading?(
        <div className="loading">Loading commissioner data…</div>
      ):status?.error&&!snapshot?(
        <div className="card emptyState">
          <h2>Database setup is incomplete</h2>
          <p>{status.error}</p>
          <p>Run both SQL migrations, set the environment variables, and redeploy.</p>
        </div>
      ):!snapshot?(
        <div className="card emptyState">
          <h2>No database rows yet</h2>
          <p>Run both SQL migrations and press Sync Sleeper Now.</p>
        </div>
      ):(
        <>
          <details className={`commissionerDrawer ${issueCount?"needsAttention":""}`} open={issueCount>0}>
            <summary><span><b>League health & identity repair</b><small>{issueCount?`${issueCount} unresolved item${issueCount===1?"":"s"} need attention`:"Everything is resolved · open for diagnostics"}</small></span><em>{issueCount?"Action required":"Healthy"}</em></summary>
            <div className="commissionerDrawerBody">
              <div className="statGrid commissionerStats">
                <div className="card stat"><b>{snapshot.users.length}</b><span>League users</span></div>
                <div className="card stat"><b>{snapshot.rosters.length}</b><span>Rosters</span></div>
                <div className="card stat"><b>{snapshot.trades.length}</b><span>2026 trades</span></div>
                <div className="card stat"><b>{snapshot.transactions.length}</b><span>Transactions</span></div>
                <div className="card stat"><b>{completedMappings.length}</b><span>Saved repairs</span></div>
              </div>
              {unresolvedUsers.length>0&&<article className="card repairSection"><div className="repairSectionHead"><div><span className="eyebrow">Repair center</span><h2>Unresolved Sleeper users</h2></div><span className="issueBadge">{unresolvedUsers.length}</span></div><div className="repairList">{unresolvedUsers.map((user:any)=>{const key=`user-${user.user_id}`;return <div className="repairRow" key={user.user_id}><div className="repairIdentity"><b>{user.username||user.display_name||"Unknown user"}</b><span>Display: {user.display_name||"—"} • Team: {user.team_name||"—"}</span><small>Sleeper user ID: {user.user_id}</small></div><div className="repairControls">{selector(key)}<button onClick={()=>saveUser(user)} disabled={savingKey===key}>{savingKey===key?"Saving…":"Assign & Save"}</button></div></div>})}</div></article>}
              {unresolvedRosters.length>0&&<article className="card repairSection"><div className="repairSectionHead"><div><span className="eyebrow">Repair center</span><h2>Unresolved rosters</h2></div><span className="issueBadge">{unresolvedRosters.length}</span></div><div className="repairList">{unresolvedRosters.map((roster:any)=>{const key=`roster-${roster.roster_id}`;return <div className="repairRow" key={roster.roster_id}><div className="repairIdentity"><b>Roster #{roster.roster_id}</b><span>Owner ID: {roster.owner_id||"No owner attached"}</span><small>Use this only when the user mapping cannot resolve the roster.</small></div><div className="repairControls">{selector(key)}<button onClick={()=>saveRoster(roster)} disabled={savingKey===key}>{savingKey===key?"Saving…":"Assign Roster"}</button></div></div>})}</div></article>}
              {!issueCount&&<article className="card healthyState"><span className="healthyIcon">✓</span><div><h2>Identity registry is fully resolved</h2><p>Future Sleeper syncs will reuse your saved commissioner mappings.</p></div></article>}
            </div>
          </details>

          <details className="commissionerDrawer" id="commissioner-records">
            <summary><span><b>System records & audit trail</b><small>Saved mappings, recent sync runs, and Commissioner activity</small></span><em>Archive</em></summary>
            <div className="commissionerDrawerBody"><div className="commissionerGrid"><article className="card"><h2>Saved identity mappings</h2><div className="integrityRows">{completedMappings.slice(0,10).map((row:any)=><div key={row.id}><span>{row.username||row.display_name||row.external_user_id}</span><b>{row.franchise_id}</b></div>)}{!completedMappings.length&&<p>No manual mappings saved yet.</p>}</div></article><article className="card"><h2>Recent sync runs</h2><div className="integrityRows">{history.slice(0,6).map((run:any)=><div key={run.id}><span>{new Date(run.started_at).toLocaleString()}</span><b>{run.status}</b></div>)}</div></article></div><article className="card"><h2>Commissioner audit log</h2><div className="tableWrap"><table><thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>Key</th><th>Note</th></tr></thead><tbody>{(repairs?.audit_log??[]).map((row:any)=><tr key={row.id}><td>{new Date(row.created_at).toLocaleString()}</td><td>{row.action}</td><td>{row.entity_type}</td><td>{row.entity_key}</td><td>{row.note||"—"}</td></tr>)}{!(repairs?.audit_log??[]).length&&<tr><td colSpan={5}>No repair activity yet.</td></tr>}</tbody></table></div></article></div>
          </details>
        </>
      )}
    </div>
  );
}
