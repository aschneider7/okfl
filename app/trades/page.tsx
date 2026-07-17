"use client";

import { useEffect, useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Loading, Page } from "@/components/Page";
import type { AnalyzerAsset } from "@/lib/futureTradeAnalyzer";

const blank = (): AnalyzerAsset => ({
  player: "",
  keeperCost: "",
  keeperYear: "Year 1",
  keeperEligible: true,
});

function AssetRow({ asset, players, onChange, onRemove }: any) {
  const [open, setOpen] = useState(false);
  const options = useMemo(() => {
    const term = asset.player.trim().toLowerCase();
    if (term.length < 2) return [];
    return players.filter((player: any) => player.name.toLowerCase().includes(term)).slice(0, 8);
  }, [players, asset.player]);

  return (
    <div className="tradeAssetRow">
      <div className="tradePlayerInput">
        <input
          value={asset.player}
          placeholder="Search player"
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => { onChange({ ...asset, player: event.target.value }); setOpen(true); }}
        />
        {open && options.length > 0 && (
          <div className="tradeSuggestions">
            {options.map((player: any) => (
              <button type="button" key={player.name} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange({ ...asset, player: player.name }); setOpen(false); }}>
                <b>{player.name}</b><small>{(player.positions || []).join("/") || "Player"} • {(player.nfl_teams || []).join(", ") || "NFL"}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="keeperEligibilityControl">
        <button
          type="button"
          className={asset.keeperEligible !== false ? "active" : ""}
          onClick={() => onChange({ ...asset, keeperEligible: true })}
        >
          Can be kept
        </button>
        <button
          type="button"
          className={asset.keeperEligible === false ? "active cantKeep" : ""}
          onClick={() =>
            onChange({
              ...asset,
              keeperEligible: false,
              keeperCost: "",
              keeperYear: "Final year",
            })
          }
        >
          Can’t be kept
        </button>
      </div>
      <input
        value={asset.keeperCost || ""}
        disabled={asset.keeperEligible === false}
        placeholder={asset.keeperEligible === false ? "Not eligible" : "Keeper cost"}
        onChange={(event) => onChange({ ...asset, keeperCost: event.target.value })}
      />
      <select
        value={asset.keeperYear || "Year 1"}
        disabled={asset.keeperEligible === false}
        onChange={(event) => onChange({ ...asset, keeperYear: event.target.value })}
      >
        <option>Year 1</option><option>Year 2</option><option>Year 3</option><option>Final year</option>
      </select>
      <button type="button" className="removeAsset" onClick={onRemove}>×</button>
    </div>
  );
}

export default function TradesPage() {
  const { data } = useData();
  const [sideA, setSideA] = useState<AnalyzerAsset[]>([blank()]);
  const [sideB, setSideB] = useState<AnalyzerAsset[]>([blank()]);
  const [result, setResult] = useState<any>(null);
  const [marketPlayers,setMarketPlayers] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [year, setYear] = useState("all");
  const [team, setTeam] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(()=>{
    fetch("/api/trade-values",{cache:"no-store"})
      .then((response)=>response.ok?response.json():Promise.reject())
      .then((body)=>setMarketPlayers(body.players||body.values||body.data||[]))
      .catch(()=>setMarketPlayers([]));
  },[]);

  if (!data) return <Loading />;

  const years = [...new Set(data.trade_analysis.map((trade: any) => trade.season))].sort((a, b) => b - a);

  const archive = data.trade_analysis
    .filter((trade: any) => {
      const text = trade.sides.map((side: any) => `${side.franchise} ${side.assets.map((asset: any) => asset.player).join(" ")}`).join(" ").toLowerCase();
      return (year === "all" || String(trade.season) === year) &&
        (team === "all" || trade.sides.some((side: any) => side.franchise_id === team)) &&
        (!query.trim() || text.includes(query.toLowerCase()));
    })
    .sort((a: any, b: any) => Number(b.season) - Number(a.season) || Number(b.week || 0) - Number(a.week || 0));

  function update(side: "A" | "B", index: number, asset: AnalyzerAsset) {
    const setter = side === "A" ? setSideA : setSideB;
    setter((current) => current.map((row, rowIndex) => rowIndex === index ? asset : row));
  }

  function remove(side: "A" | "B", index: number) {
    const setter = side === "A" ? setSideA : setSideB;
    setter((current) => current.length === 1 ? [blank()] : current.filter((_, rowIndex) => rowIndex !== index));
  }

  return (
    <Page title="Trade Center" subtitle="Review every historical deal and build a custom OKFL trade analysis.">
      <section className="tradeCenterHero">
        <div>
          <span className="eyebrow">Front-office decision lab</span>
          <h2>Historical deals + custom analyzer</h2>
          <p>The model is future-facing only: live 2QB market value, age-adjusted consensus rank, keeper eligibility, keeper round, and remaining keeper years. Past Keeper adj. is not used.</p>
        </div>
        <div className="tradeHeroStats">
          <div><b>{data.trade_analysis.length}</b><span>Trades</span></div>
          <div><b>{years.length}</b><span>Seasons</span></div>
          <div><b>{data.players.length}</b><span>Players</span></div>
        </div>
      </section>

      <section className="tradeAnalyzer">
        <header>
          <div><span className="eyebrow">Custom analyzer</span><h2>Build your trade</h2></div>
          <button
            type="button"
            disabled={analyzing}
            onClick={async () => {
              setAnalyzing(true);
              setAnalyzeError("");
              try {
                const response = await fetch("/api/trade/analyze", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ sideA, sideB }),
                });
                const body = await response.json();
                if (!response.ok) throw new Error(body.error || "Trade analysis failed.");
                setResult(body);
              } catch (error) {
                setResult(null);
                setAnalyzeError(error instanceof Error ? error.message : String(error));
              } finally {
                setAnalyzing(false);
              }
            }}
          >
            {analyzing ? "Pulling live values…" : "Analyze trade"}
          </button>
        </header>
        {analyzeError && <div className="tradeAnalyzeError">{analyzeError}</div>}
        <div className="tradeBuilder">
          {(["A", "B"] as const).map((side) => {
            const rows = side === "A" ? sideA : sideB;
            const setter = side === "A" ? setSideA : setSideB;
            return (
              <article className="tradeSide" key={side}>
                <div className="tradeSideTitle"><b>Side {side}</b><span>{rows.filter((row) => row.player.trim()).length} players</span></div>
                {rows.map((asset, index) => (
                  <AssetRow key={`${side}-${index}`} asset={asset} players={data.players} onChange={(value: AnalyzerAsset) => update(side, index, value)} onRemove={() => remove(side, index)} />
                ))}
                <button type="button" className="addAsset" onClick={() => setter((current) => [...current, blank()])}>+ Add player</button>
              </article>
            );
          })}
        </div>

        {result && (
          <section className="tradeVerdict">
            <header>
              <div><span className="eyebrow">Model verdict</span><h2>{result.winner === "Even" ? "Essentially even" : `${result.winner} wins`}</h2><p>{result.grade} • {Math.round(result.difference).toLocaleString()} value-point difference • {result.format} market dated {result.marketDate || "current"}</p></div>
              <span className="tradeGrade">{result.grade}</span>
            </header>
            <div className="tradeResultGrid">
              {[result.a, result.b].map((side: any) => (
                <article className={result.winner === side.label ? "winner" : ""} key={side.label}>
                  <div className="tradeResultTop"><b>{side.label}</b><strong>{side.total.toFixed(1)}</strong></div>
                  <div className="tradeFactors">
                    <div><span>Market value</span><b>{Math.round(side.marketValue).toLocaleString()}</b></div>
                    <div><span>Keeper bonus</span><b>{Math.round(side.keeperValue).toLocaleString()}</b></div>
                  </div>
                  {side.assets.map((asset: any) => (
                    <div className="assetResult" key={asset.player}>
                      <header><b>{asset.player}</b><strong>{Math.round(asset.total).toLocaleString()}</strong></header>
                      <span>{asset.position} • {asset.nflTeam} • Age {asset.age ?? "—"} • 2QB rank {asset.marketRank ?? "—"}</span>
                      <ul>{asset.notes.map((note: string) => <li key={note}>{note}</li>)}</ul>
                    </div>
                  ))}
                </article>
              ))}
            </div>
            <div className="tradeReasons"><b>Why:</b>{result.reasons.map((reason: string) => <span key={reason}>{reason}</span>)}<a href={result.sourceUrl} target="_blank" rel="noreferrer">Source: {result.source} ↗</a></div>
          </section>
        )}
      </section>

      <section className="tradeArchive">
        <div className="tradeArchiveHead">
          <div><span className="eyebrow">Historical archive</span><h2>Every completed trade</h2></div>
          <div>
            <select value={year} onChange={(event) => setYear(event.target.value)}><option value="all">All years</option>{years.map((value) => <option key={value}>{value}</option>)}</select>
            <select value={team} onChange={(event) => setTeam(event.target.value)}><option value="all">All teams</option>{data.franchises.map((franchise: any) => <option key={franchise.id} value={franchise.id}>{franchise.name}</option>)}</select>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Player or team" />
          </div>
        </div>
        <div className="tradeCards">
          {archive.map((trade: any) => (
            <article key={trade.transaction_id}>
              <header><span>{trade.season} • Week {trade.week || "—"}</span><b>Winner: {trade.algorithmic_winner || "TBD"}</b></header>
              <div>{trade.sides.map((side: any) => <section key={side.franchise_id}><b>{side.franchise}</b><p>{side.assets.map((asset: any) => asset.player).join(", ")}</p></section>)}</div>
            </article>
          ))}
        </div>
      </section>
    </Page>
  );
}
