"use client";

import { useState } from "react";
import { Page, Loading } from "@/components/Page";
import { useData } from "@/components/DataProvider";
import {KeeperSubmissionPanel} from "@/components/KeeperSubmissionPanel";

type SortKey = "season" | "franchise" | "player" | "cost" | "keeper_year" | "status";
type Direction = "asc" | "desc";

function roundNumber(cost: string) {
  const match = String(cost || "").match(/\d+/);
  return match ? Number(match[0]) : 99;
}

function View() {
  const { data } = useData();
  const [team, setTeam] = useState("all");
  const [year, setYear] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("season");
  const [direction, setDirection] = useState<Direction>("desc");

  if (!data) return <Loading />;

  const years = [...new Set(data.keepers.map((keeper: any) => keeper.season))].sort((a, b) => b - a);
  const teams = [...data.franchises].sort((a: any, b: any) => a.name.localeCompare(b.name));
  const statuses = [...new Set(data.keepers.map((keeper: any) => keeper.status).filter(Boolean))].sort();

  const term = query.trim().toLowerCase();
  const filtered = data.keepers
    .filter((keeper: any) => {
      const teamMatch = team === "all" || keeper.franchise_id === team;
      const yearMatch = year === "all" || String(keeper.season) === year;
      const statusMatch = status === "all" || keeper.status === status;
      const textMatch =
        !term ||
        `${keeper.player} ${keeper.franchise} ${keeper.cost} ${keeper.keeper_year} ${keeper.status}`
          .toLowerCase()
          .includes(term);
      return teamMatch && yearMatch && statusMatch && textMatch;
    })
    .sort((a: any, b: any) => {
      let left: any = a[sortKey];
      let right: any = b[sortKey];
      if (sortKey === "cost") {
        left = roundNumber(a.cost);
        right = roundNumber(b.cost);
      }
      if (typeof left === "string") left = left.toLowerCase();
      if (typeof right === "string") right = right.toLowerCase();
      const comparison = left < right ? -1 : left > right ? 1 : 0;
      return direction === "asc" ? comparison : -comparison;
    });

  const counts = new Map<string, number>();
  filtered.forEach((keeper: any) =>
    counts.set(keeper.franchise, (counts.get(keeper.franchise) || 0) + 1),
  );
  const teamSummary = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  function sort(column: SortKey) {
    if (sortKey === column) setDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(column);
      setDirection(column === "season" ? "desc" : "asc");
    }
  }

  const arrow = (column: SortKey) => (sortKey === column ? (direction === "asc" ? " ↑" : " ↓") : "");

  return (
    <Page
      title="Keeper Center"
      subtitle="Explore every keeper decision by season, franchise, cost, and keeper year."
    >
      <KeeperSubmissionPanel />
      <section className="keepersHero">
        <div>
          <span className="eyebrow">Roster continuity archive</span>
          <h2>{filtered.length} keeper decisions</h2>
          <p>Filter the archive, compare team usage, and sort every column without leaving the page.</p>
        </div>
        <div className="keeperHeroStats">
          <div><b>{years.length}</b><span>Seasons</span></div>
          <div><b>{teamSummary.length}</b><span>Teams shown</span></div>
          <div><b>{new Set(filtered.map((row: any) => row.player)).size}</b><span>Players</span></div>
        </div>
      </section>

      <section className="card keeperToolbar">
        <div className="keeperFilters">
          <label>
            <span>Franchise</span>
            <select value={team} onChange={(event) => setTeam(event.target.value)}>
              <option value="all">All franchises</option>
              {teams.map((franchise: any) => (
                <option key={franchise.id} value={franchise.id}>{franchise.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Season</span>
            <select value={year} onChange={(event) => setYear(event.target.value)}>
              <option value="all">All seasons</option>
              {years.map((season) => <option key={season} value={season}>{season}</option>)}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All statuses</option>
              {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="keeperSearch">
            <span>Search</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Player, team, cost…" />
          </label>
        </div>
        <button
          className="resetFilters"
          type="button"
          onClick={() => {
            setTeam("all");
            setYear("all");
            setStatus("all");
            setQuery("");
            setSortKey("season");
            setDirection("desc");
          }}
        >
          Reset filters
        </button>
      </section>

      <div className="keeperLayout">
        <section className="card keeperTableCard">
          <div className="keeperTableHeader">
            <div>
              <span className="eyebrow">Keeper ledger</span>
              <h2>Sortable decision history</h2>
            </div>
            <span>{filtered.length} rows</span>
          </div>
          <div className="tableWrap">
            <table className="keeperTable">
              <thead>
                <tr>
                  <th><button onClick={() => sort("season")}>Season{arrow("season")}</button></th>
                  <th><button onClick={() => sort("franchise")}>Franchise{arrow("franchise")}</button></th>
                  <th><button onClick={() => sort("player")}>Player{arrow("player")}</button></th>
                  <th><button onClick={() => sort("cost")}>Cost{arrow("cost")}</button></th>
                  <th><button onClick={() => sort("keeper_year")}>Keeper year{arrow("keeper_year")}</button></th>
                  <th><button onClick={() => sort("status")}>Status{arrow("status")}</button></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((keeper: any, index: number) => (
                  <tr key={`${keeper.season}-${keeper.franchise_id}-${keeper.player}-${index}`}>
                    <td><span className="seasonBadge">{keeper.season}</span></td>
                    <td><b className="teamName">{keeper.franchise}</b></td>
                    <td><b>{keeper.player}</b></td>
                    <td><span className="costBadge">{keeper.cost}</span></td>
                    <td>{keeper.keeper_year}</td>
                    <td><span className={`keeperStatus ${String(keeper.status).toLowerCase().replace(/\s+/g, "-")}`}>{keeper.status}</span></td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={6}><div className="keeperEmpty">No keeper decisions match those filters.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="card keeperLeaderboard">
          <span className="eyebrow">Current view</span>
          <h2>Keeper volume by team</h2>
          <div className="keeperTeamBars">
            {teamSummary.map(([franchise, count], index) => {
              const max = teamSummary[0]?.[1] || 1;
              return (
                <div key={franchise}>
                  <header><span>{index + 1}. {franchise}</span><b>{count}</b></header>
                  <i><span style={{ width: `${(count / max) * 100}%` }} /></i>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </Page>
  );
}

export default function Keepers() {
  return <View />;
}
