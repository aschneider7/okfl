"use client";

import {useMemo, useState} from "react";
import {Page, Loading} from "@/components/Page";
import {useData} from "@/components/DataProvider";

export default function Drafts() {
  const {data} = useData();
  const [year, setYear] = useState("2025"); const [round, setRound] = useState("");
  const [team, setTeam] = useState("all"); const [query, setQuery] = useState("");
  const rows = useMemo(() => data ? [...data.draft_picks].filter((pick: any) =>
    (!year || String(pick.season) === year) && (!round || String(pick.round_num) === round) &&
    (team === "all" || pick.franchise_id === team) && (!query.trim() || `${pick.player} ${pick.franchise} ${pick.position}`.toLowerCase().includes(query.toLowerCase()))
  ) : [], [data, year, round, team, query]);
  if (!data) return <Loading />;

  const seasons = [...new Set(data.draft_picks.map((pick: any) => Number(pick.season)))].sort((a, b) => b - a);
  const grades = data.draft_grades.filter((grade: any) => String(grade.season) === year).sort((a: any, b: any) => Number(b.score) - Number(a.score));
  const futurePoints = rows.reduce((sum: number, pick: any) => sum + Number(pick.tracked_future_points || 0), 0);
  const keeperYears = rows.reduce((sum: number, pick: any) => sum + Number(pick.keeper_years_created || 0), 0);
  const titles = rows.reduce((sum: number, pick: any) => sum + Number(pick.championships_created || 0), 0);
  const bestPick = [...rows].sort((a: any, b: any) => Number(b.tracked_future_points || 0) - Number(a.tracked_future_points || 0))[0];
  const roundIntel = data.round_values.find((value: any) => String(value.round) === (round || "1"));

  return <Page title="Draft History" subtitle="Every selection, class grade, keeper hit, and long-term value result in one draft archive.">
    <section className="archivePageHero draftHistoryHero"><div><span className="eyebrow">Draft archive</span><h2>{year} draft class</h2><p>See which front offices created lasting value—and which picks disappeared from the league.</p></div>
      <div className="archiveHeroStats"><div><b>{rows.length}</b><span>Picks shown</span></div><div><b>{Math.round(futurePoints).toLocaleString()}</b><span>Future points</span></div><div><b>{keeperYears}</b><span>Keeper years</span></div><div><b>{titles}</b><span>Titles created</span></div></div></section>

    <section className="card archiveToolbar"><label><span>Season</span><select value={year} onChange={(event) => setYear(event.target.value)}>{seasons.map((season) => <option key={season}>{season}</option>)}</select></label>
      <label><span>Round</span><select value={round} onChange={(event) => setRound(event.target.value)}><option value="">All rounds</option>{Array.from({length: 17}, (_, index) => index + 1).map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>Franchise</span><select value={team} onChange={(event) => setTeam(event.target.value)}><option value="all">All franchises</option>{data.franchises.map((franchise) => <option value={franchise.id} key={franchise.id}>{franchise.name}</option>)}</select></label>
      <label className="archiveSearch"><span>Find a pick</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Player or franchise" /></label></section>

    <section className="draftGradeSection"><div className="sectionTitle"><div><span className="eyebrow">Front-office report cards</span><h2>{year} class grades</h2></div><span>{grades.length} franchises</span></div>
      <div className="draftGradeStrip">{grades.map((grade: any, index: number) => <article key={grade.franchise_id} className={index < 3 ? "podium" : ""}><span>#{index + 1}</span><div><b>{grade.franchise}</b><small>{grade.picks.length} selections</small></div><strong>{grade.grade}</strong><em>{Number(grade.score).toFixed(1)}</em></article>)}</div></section>

    <div className="draftArchiveLayout"><section className="card draftLedger"><div className="keeperTableHeader"><div><span className="eyebrow">Selection ledger</span><h2>{rows.length} matching picks</h2></div><span>{round ? `Round ${round}` : "All rounds"}</span></div>
      <div className="tableWrap"><table><thead><tr><th>Pick</th><th>Franchise</th><th>Player</th><th>Pos</th><th>Future points</th><th>Keeper years</th><th>Titles</th></tr></thead><tbody>{rows.map((pick: any) => <tr key={`${pick.season}-${pick.overall_num}`}><td><span className="draftPickBadge">{pick.round_num}.{pick.overall_num}</span></td><td><b>{pick.franchise}</b></td><td><b>{pick.player}</b><small className="draftTeamMeta">{pick.nfl_team || "NFL team unavailable"}</small></td><td><span className="positionPill">{pick.position || "—"}</span></td><td><strong className="valueNumber">{Number(pick.tracked_future_points || 0).toFixed(1)}</strong></td><td>{pick.keeper_years_created || 0}</td><td>{pick.championships_created || 0}</td></tr>)}</tbody></table></div></section>
      <aside className="draftIntelRail"><article className="card bestDraftPick"><span className="eyebrow">Best result in view</span><h2>{bestPick?.player || "—"}</h2><p>{bestPick ? `${bestPick.franchise} · Round ${bestPick.round_num}` : "No pick selected"}</p><b>{bestPick ? Number(bestPick.tracked_future_points || 0).toFixed(1) : "—"}</b><small>tracked future points</small></article>
        {roundIntel && <article className="card roundIntel"><span className="eyebrow">Round {roundIntel.round} intelligence</span><h2>{roundIntel.best_player}</h2><p>Best historical result from this round.</p><div><span><b>{Number(roundIntel.avg_future_points).toFixed(1)}</b>Average points</span><span><b>{Number(roundIntel.keeper_rate).toFixed(1)}%</b>Keeper rate</span><span><b>{roundIntel.championships}</b>Titles</span></div></article>}</aside></div>
  </Page>;
}
