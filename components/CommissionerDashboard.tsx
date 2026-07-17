"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function CommissionerDashboard() {
  const [status,setStatus] = useState<any>(null);
  const [loading,setLoading] = useState(true);
  const [syncing,setSyncing] = useState(false);
  const [message,setMessage] = useState("");
  const router = useRouter();

  async function load() {
    setLoading(true);
    const response = await fetch("/api/sleeper/status",{cache:"no-store"});
    const body = await response.json();
    setStatus(body);
    setLoading(false);
  }

  useEffect(()=>{load()},[]);

  async function sync() {
    setSyncing(true);
    setMessage("");
    const response = await fetch("/api/sleeper/sync",{method:"POST"});
    const body = await response.json();
    setSyncing(false);
    setMessage(
      response.ok
        ? `Synced to Supabase at ${new Date(body.synced_at).toLocaleString()}`
        : body.error || "Sync failed"
    );
    if (response.ok) load();
  }

  async function logout() {
    await fetch("/api/commissioner/logout",{method:"POST"});
    router.refresh();
  }

  const snapshot = status?.snapshot;
  const history = status?.history ?? [];

  return (
    <div className="commissionerPage">
      <div className="pageHead commissionerHead">
        <div>
          <span className="eyebrow">Private commissioner tools</span>
          <h1>Commissioner OS</h1>
          <p>Control the live 2026 Sleeper connection and the Supabase league database.</p>
        </div>
        <button className="secondaryButton" onClick={logout}>Lock dashboard</button>
      </div>

      <div className="commissionerActions">
        <article className="card syncCard">
          <div>
            <span className="eyebrow">Sleeper league</span>
            <h2>2026 Database Sync</h2>
            <p>League ID: 1381102523590389760</p>
          </div>
          <button onClick={sync} disabled={syncing}>
            {syncing ? "Syncing all 18 weeks…" : "Sync Sleeper Now"}
          </button>
          {message && <div className="syncMessage">{message}</div>}
        </article>

        <article className="card">
          <span className="eyebrow">Storage</span>
          <h2>Supabase PostgreSQL</h2>
          <p>Trades, transactions, matchups, rosters, picks, drafts and sync runs are stored as database rows.</p>
          <div className={`statusPill ${status?.configured ? "success" : ""}`}>
            {status?.configured ? "Connected" : "Environment setup required"}
          </div>
        </article>
      </div>

      {loading ? (
        <div className="loading">Loading database status…</div>
      ) : status?.error && !snapshot ? (
        <div className="card emptyState">
          <h2>Supabase is not ready</h2>
          <p>{status.error}</p>
          <p>Run the SQL migration, add the environment variables, then redeploy.</p>
        </div>
      ) : !snapshot ? (
        <div className="card emptyState">
          <h2>No database rows yet</h2>
          <p>Run the SQL migration and press Sync Sleeper Now.</p>
        </div>
      ) : (
        <>
          <div className="statGrid commissionerStats">
            <div className="card stat"><b>{snapshot.users.length}</b><span>League users</span></div>
            <div className="card stat"><b>{snapshot.rosters.length}</b><span>Rosters</span></div>
            <div className="card stat"><b>{snapshot.trades.length}</b><span>2026 trades</span></div>
            <div className="card stat"><b>{snapshot.transactions.length}</b><span>Transactions</span></div>
            <div className="card stat"><b>{snapshot.matchups.length}</b><span>Team-week rows</span></div>
            <div className="card stat">
              <b>{snapshot.synced_at ? new Date(snapshot.synced_at).toLocaleString() : "—"}</b>
              <span>Last sync</span>
            </div>
          </div>

          <div className="commissionerGrid">
            <article className="card">
              <h2>Identity integrity</h2>
              <div className="integrityRows">
                <div><span>Mapped users</span><b>{snapshot.integrity.mapped_users}/{snapshot.users.length}</b></div>
                <div><span>Mapped rosters</span><b>{snapshot.integrity.mapped_rosters}/{snapshot.rosters.length}</b></div>
                <div><span>Unresolved users</span><b>{snapshot.integrity.unresolved_users.length}</b></div>
                <div><span>Unresolved rosters</span><b>{snapshot.integrity.unresolved_rosters.length}</b></div>
              </div>
            </article>

            <article className="card">
              <h2>Recent sync runs</h2>
              <div className="integrityRows">
                {history.slice(0,5).map((run:any)=>(
                  <div key={run.id}>
                    <span>{new Date(run.started_at).toLocaleString()}</span>
                    <b>{run.status}</b>
                  </div>
                ))}
              </div>
            </article>
          </div>

          {snapshot.integrity.unresolved_users.length > 0 && (
            <article className="card unresolved">
              <h2>Unresolved Sleeper users</h2>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr><th>Username</th><th>Display name</th><th>Team name</th><th>User ID</th></tr>
                  </thead>
                  <tbody>
                    {snapshot.integrity.unresolved_users.map((user:any)=>(
                      <tr key={user.user_id}>
                        <td>{user.username}</td>
                        <td>{user.display_name}</td>
                        <td>{user.team_name || "—"}</td>
                        <td>{user.user_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          )}
        </>
      )}
    </div>
  );
}
