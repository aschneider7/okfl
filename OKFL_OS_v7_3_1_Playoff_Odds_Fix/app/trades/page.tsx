"use client";

import {useEffect, useMemo, useState} from "react";
import {useData} from "@/components/DataProvider";
import {Loading, Page} from "@/components/Page";
import type {AnalyzerAsset, TradeContext, TradeWindow} from "@/lib/futureTradeAnalyzer";

type SideKey = "A" | "B";
type Scenario = {
  sideA: AnalyzerAsset[]; sideB: AnalyzerAsset[];
  contextA: TradeContext; contextB: TradeContext;
  teamA: string; teamB: string;
};

const blankPlayer = (): AnalyzerAsset => ({type: "player", player: "", keeperCost: "", keeperYear: "Year 1", keeperEligible: true});
const blankPick = (): AnalyzerAsset => ({type: "pick", player: "Draft pick", pickYear: 2026, pickRound: 1, keeperEligible: false});
const blankContext = (): TradeContext => ({window: "balanced", needs: []});

function AssetRow({asset, players, onChange, onRemove}: {
  asset: AnalyzerAsset; players: any[]; onChange: (asset: AnalyzerAsset) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const options = useMemo(() => {
    if (asset.type === "pick") return [];
    const term = asset.player.trim().toLowerCase();
    if (term.length < 2) return [];
    return players.filter((player) => player.name.toLowerCase().includes(term)).slice(0, 8);
  }, [players, asset.player, asset.type]);

  if (asset.type === "pick") return <div className="tradeAssetRow tradePickRow">
    <div className="assetTypeBadge">Draft pick</div>
    <select aria-label="Pick year" value={asset.pickYear ?? 2026} onChange={(event) => onChange({...asset, pickYear: Number(event.target.value)})}>
      {[2026, 2027, 2028, 2029].map((year) => <option key={year}>{year}</option>)}
    </select>
    <select aria-label="Pick round" value={asset.pickRound ?? 1} onChange={(event) => onChange({...asset, pickRound: Number(event.target.value)})}>
      {Array.from({length: 17}, (_, index) => index + 1).map((round) => <option key={round} value={round}>Round {round}</option>)}
    </select>
    <div className="pickValueHint">Future capital</div>
    <button type="button" className="removeAsset" aria-label="Remove draft pick" onClick={onRemove}>×</button>
  </div>;

  return <div className="tradeAssetRow">
    <div className="tradePlayerInput">
      <input value={asset.player} placeholder="Search player" aria-label="Player name"
        onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => { onChange({...asset, player: event.target.value}); setOpen(true); }} />
      {open && options.length > 0 && <div className="tradeSuggestions">
        {options.map((player) => <button type="button" key={player.name} onMouseDown={(event) => event.preventDefault()}
          onClick={() => { onChange({...asset, player: player.name}); setOpen(false); }}>
          <b>{player.name}</b><small>{(player.positions || []).join("/") || "Player"} • {(player.nfl_teams || []).join(", ") || "NFL"}</small>
        </button>)}
      </div>}
    </div>
    <div className="keeperEligibilityControl" aria-label="Keeper eligibility">
      <button type="button" className={asset.keeperEligible !== false ? "active" : ""} onClick={() => onChange({...asset, keeperEligible: true})}>Can be kept</button>
      <button type="button" className={asset.keeperEligible === false ? "active cantKeep" : ""}
        onClick={() => onChange({...asset, keeperEligible: false, keeperCost: "", keeperYear: "Final year"})}>Can’t be kept</button>
    </div>
    <input value={asset.keeperCost || ""} disabled={asset.keeperEligible === false}
      placeholder={asset.keeperEligible === false ? "Not eligible" : "Keeper cost"} aria-label="Keeper round cost"
      onChange={(event) => onChange({...asset, keeperCost: event.target.value})} />
    <select value={asset.keeperYear || "Year 1"} disabled={asset.keeperEligible === false} aria-label="Keeper contract year"
      onChange={(event) => onChange({...asset, keeperYear: event.target.value})}>
      <option>Year 1</option><option>Year 2</option><option>Year 3</option><option>Final year</option>
    </select>
    <button type="button" className="removeAsset" aria-label={`Remove ${asset.player || "player"}`} onClick={onRemove}>×</button>
  </div>;
}

function SideContext({team, setTeam, context, setContext, franchises}: {
  team: string; setTeam: (value: string) => void; context: TradeContext; setContext: (value: TradeContext) => void; franchises: any[];
}) {
  return <div className="tradeTeamContext">
    <label><span>Franchise</span><select value={team} onChange={(event) => setTeam(event.target.value)}>
      <option value="">Unassigned side</option>{franchises.map((franchise) => <option key={franchise.id} value={franchise.id}>{franchise.name}</option>)}
    </select></label>
    <label><span>Team window</span><select value={context.window} onChange={(event) => setContext({...context, window: event.target.value as TradeWindow})}>
      <option value="contending">Contending</option><option value="balanced">Balanced</option><option value="retooling">Retooling</option>
    </select></label>
    <div className="tradeNeeds"><span>Roster needs</span><div>{["QB", "RB", "WR", "TE"].map((position) => <button type="button" key={position}
      className={context.needs.includes(position) ? "active" : ""} aria-pressed={context.needs.includes(position)}
      onClick={() => setContext({...context, needs: context.needs.includes(position) ? context.needs.filter((need) => need !== position) : [...context.needs, position]})}>{position}</button>)}</div></div>
  </div>;
}

export default function TradesPage() {
  const {data} = useData();
  const [sideA, setSideA] = useState<AnalyzerAsset[]>([blankPlayer()]);
  const [sideB, setSideB] = useState<AnalyzerAsset[]>([blankPlayer()]);
  const [contextA, setContextA] = useState<TradeContext>(blankContext);
  const [contextB, setContextB] = useState<TradeContext>(blankContext);
  const [teamA, setTeamA] = useState(""); const [teamB, setTeamB] = useState("");
  const [result, setResult] = useState<any>(null); const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(""); const [shareMessage, setShareMessage] = useState("");
  const [year, setYear] = useState("all"); const [team, setTeam] = useState("all"); const [query, setQuery] = useState("");

  useEffect(() => {
    const encoded = new URLSearchParams(window.location.search).get("trade");
    if (!encoded) return;
    try {
      const scenario = JSON.parse(encoded) as Partial<Scenario>;
      if (Array.isArray(scenario.sideA) && Array.isArray(scenario.sideB)) {
        setSideA(scenario.sideA); setSideB(scenario.sideB);
        if (scenario.contextA) setContextA(scenario.contextA); if (scenario.contextB) setContextB(scenario.contextB);
        setTeamA(scenario.teamA || ""); setTeamB(scenario.teamB || ""); setShareMessage("Shared scenario loaded.");
      }
    } catch { setShareMessage("That shared scenario could not be loaded."); }
  }, []);

  if (!data) return <Loading />;
  const years = [...new Set(data.trade_analysis.map((trade: any) => Number(trade.season)))].sort((a, b) => b - a);
  const archive = data.trade_analysis.filter((trade: any) => {
    const text = trade.sides.map((side: any) => `${side.franchise} ${side.assets.map((asset: any) => asset.player).join(" ")}`).join(" ").toLowerCase();
    return (year === "all" || String(trade.season) === year) && (team === "all" || trade.sides.some((side: any) => side.franchise_id === team)) && (!query.trim() || text.includes(query.toLowerCase()));
  }).sort((a: any, b: any) => Number(b.season) - Number(a.season) || Number(b.week || 0) - Number(a.week || 0));

  const sideLabel = (key: SideKey) => {
    const id = key === "A" ? teamA : teamB;
    return data.franchises.find((franchise) => franchise.id === id)?.name || `Side ${key}`;
  };
  function update(side: SideKey, index: number, asset: AnalyzerAsset) {
    (side === "A" ? setSideA : setSideB)((current) => current.map((row, rowIndex) => rowIndex === index ? asset : row));
  }
  function remove(side: SideKey, index: number) {
    (side === "A" ? setSideA : setSideB)((current) => current.length === 1 ? [blankPlayer()] : current.filter((_, rowIndex) => rowIndex !== index));
  }
  async function analyze() {
    setAnalyzing(true); setAnalyzeError("");
    try {
      const response = await fetch("/api/trade/analyze", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({sideA, sideB, contextA, contextB})});
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "Trade analysis failed."); setResult(body);
    } catch (error) { setResult(null); setAnalyzeError(error instanceof Error ? error.message : String(error)); }
    finally { setAnalyzing(false); }
  }
  async function shareScenario() {
    const scenario: Scenario = {sideA, sideB, contextA, contextB, teamA, teamB};
    const url = new URL(window.location.href); url.searchParams.set("trade", JSON.stringify(scenario));
    window.history.replaceState(null, "", url); await navigator.clipboard.writeText(url.toString()); setShareMessage("Shareable trade link copied.");
  }

  return <Page title="Trade Center" subtitle="Model players, keeper value, draft capital, and each franchise’s competitive window.">
    <section className="tradeCenterHero"><div><span className="eyebrow">Trade Machine 2.0</span><h2>Build for the team you actually have</h2>
      <p>Compare current PPR value, keeper surplus, draft capital, positional needs, and contender-versus-retooling fit. Every adjustment is explained.</p></div>
      <div className="tradeHeroStats"><div><b>{data.trade_analysis.length}</b><span>Trades</span></div><div><b>17</b><span>Pick rounds</span></div><div><b>3</b><span>Team windows</span></div></div></section>

    <section className="tradeAnalyzer">
      <header><div><span className="eyebrow">Front-office lab</span><h2>Build your trade</h2></div><div className="tradeHeaderActions">
        <button type="button" className="secondary" onClick={shareScenario}>Share</button><button type="button" disabled={analyzing} onClick={analyze}>{analyzing ? "Analyzing…" : "Analyze trade"}</button>
      </div></header>
      {(analyzeError || shareMessage) && <div className={analyzeError ? "tradeAnalyzeError" : "tradeShareMessage"} role="status">{analyzeError || shareMessage}</div>}
      <div className="tradeBuilder">{(["A", "B"] as const).map((side) => {
        const rows = side === "A" ? sideA : sideB; const setter = side === "A" ? setSideA : setSideB;
        const context = side === "A" ? contextA : contextB; const setContext = side === "A" ? setContextA : setContextB;
        return <article className="tradeSide" key={side}><div className="tradeSideTitle"><b>{sideLabel(side)}</b><span>{rows.length} asset{rows.length === 1 ? "" : "s"}</span></div>
          <SideContext team={side === "A" ? teamA : teamB} setTeam={side === "A" ? setTeamA : setTeamB} context={context} setContext={setContext} franchises={data.franchises} />
          {rows.map((asset, index) => <AssetRow key={`${side}-${index}`} asset={asset} players={data.players} onChange={(value) => update(side, index, value)} onRemove={() => remove(side, index)} />)}
          <div className="addAssetActions"><button type="button" className="addAsset" onClick={() => setter((current) => [...current, blankPlayer()])}>+ Player</button>
            <button type="button" className="addAsset" onClick={() => setter((current) => [...current, blankPick()])}>+ Draft pick</button></div>
        </article>;
      })}</div>

      {result && <section className="tradeVerdict"><header><div><span className="eyebrow">Model verdict</span><h2>{result.winner === "Even" ? "Essentially even" : `${result.winner === "Side A" ? sideLabel("A") : sideLabel("B")} wins`}</h2>
        <p>{result.grade} • {Math.round(result.difference).toLocaleString()} points • {result.format}</p></div><span className="tradeGrade">{result.grade}</span></header>
        {result.balancer && <div className="fairnessNudge"><div><span className="eyebrow">Make it fair</span><b>{result.balancer.label.replace("Side A", sideLabel("A")).replace("Side B", sideLabel("B"))}</b><small>Closest simple draft-capital adjustment to the current gap.</small></div>
          <button type="button" onClick={() => { const target = result.balancer.targetSide === "Side A" ? setSideA : setSideB; target((current: AnalyzerAsset[]) => [...current, {...blankPick(), pickRound: result.balancer.round}]); setResult(null); }}>Apply suggestion</button></div>}
        <div className="tradeResultGrid">{[result.a, result.b].map((side: any, index: number) => <article className={result.winner === side.label ? "winner" : ""} key={side.label}>
          <div className="tradeResultTop"><b>{index === 0 ? sideLabel("A") : sideLabel("B")}</b><strong>{Math.round(side.total).toLocaleString()}</strong></div>
          <div className="tradeFactors"><div><span>Market</span><b>{Math.round(side.marketValue).toLocaleString()}</b></div><div><span>Keeper</span><b>{Math.round(side.keeperValue).toLocaleString()}</b></div><div><span>Team fit</span><b>{side.contextValue > 0 ? "+" : ""}{Math.round(side.contextValue).toLocaleString()}</b></div></div>
          {side.assets.map((asset: any) => <div className="assetResult" key={asset.player}><header><b>{asset.player}</b><strong>{Math.round(asset.total).toLocaleString()}</strong></header>
            <span>{asset.kind === "pick" ? "Draft capital" : `${asset.position} • ${asset.nflTeam} • Age ${asset.age ?? "—"} • OKFL rank ${asset.okflRank ?? "—"}`}</span>
            <ul>{asset.notes.map((note: string) => <li key={note}>{note}</li>)}</ul></div>)}
        </article>)}</div>
        <div className="tradeReasons"><b>Why:</b>{result.reasons.map((reason: string) => <span key={reason}>{reason}</span>)}<a href={result.sourceUrl} target="_blank" rel="noreferrer">Source: {result.source} ↗</a></div>
      </section>}
    </section>

    <section className="tradeArchive"><div className="tradeArchiveHead"><div><span className="eyebrow">Historical archive</span><h2>Every completed trade</h2></div><div>
      <select value={year} onChange={(event) => setYear(event.target.value)}><option value="all">All years</option>{years.map((value) => <option key={value}>{value}</option>)}</select>
      <select value={team} onChange={(event) => setTeam(event.target.value)}><option value="all">All teams</option>{data.franchises.map((franchise) => <option key={franchise.id} value={franchise.id}>{franchise.name}</option>)}</select>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Player or team" /></div></div>
      <div className="tradeCards">{archive.map((trade: any) => <article key={trade.transaction_id}><header><span>{trade.season} • Week {trade.week || "—"}</span><b>Winner: {trade.algorithmic_winner || "TBD"}</b></header>
        <div>{trade.sides.map((side: any) => <section key={side.franchise_id}><b>{side.franchise}</b><p>{side.assets.map((asset: any) => asset.player).join(", ")}</p></section>)}</div></article>)}</div>
    </section>
  </Page>;
}
