import {useDraft} from "../context/DraftContext";
import {PlayerCard} from "./PlayerCard";

export function DraftWorkspace() {
  const {available, filteredPlayers, position, setPosition, query, setQuery, recommendations,
    selectedPlayer, setSelectedPlayer, userOnClock, watchlist, queue, toggleWatchlist, toggleQueue} = useDraft();
  const positions = ["ALL", "QB", "RB", "WR", "TE", "K", "DEF"];
  return <section className="draftV2Workspace">
    <header className="playerPoolHeader">
      <div><span className="eyebrow">Live PPR market</span><h2>Available players</h2></div>
      <div className="playerPoolFilters">
        <input aria-label="Search available players" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players" />
      </div>
      <span className="availableCount"><b>{available.length}</b> available</span>
    </header>
    <div className="positionTabs" role="tablist" aria-label="Filter players by position">
      {positions.map((value) => <button key={value} role="tab" aria-selected={position === value}
        className={position === value ? "active" : ""} onClick={() => setPosition(value)}>
        {value}<span>{value === "ALL" ? available.length : available.filter((player) => player.position === value).length}</span>
      </button>)}
    </div>
    <div className="playerTableLabels"><span>Pos</span><span>Player</span><span>Market / OKFL</span><span>Score</span><span>Actions</span></div>
    <div className="draftV2PlayerGrid">{filteredPlayers.map((player) => <PlayerCard key={player.name} player={player}
      recommendation={recommendations.find((row) => row.player.name === player.name)}
      selected={selectedPlayer?.name === player.name} disabled={!userOnClock} watched={watchlist.includes(player.name)} queued={queue.includes(player.name)}
      onSelect={() => setSelectedPlayer(player)} onWatch={() => toggleWatchlist(player)} onQueue={() => toggleQueue(player)} />)}</div>
  </section>;
}
