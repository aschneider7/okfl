import {useDraft} from "../context/DraftContext";
import {PlayerCard} from "./PlayerCard";

export function DraftWorkspace() {
  const {available, filteredPlayers, position, setPosition, query, setQuery, recommendations,
    selectedPlayer, setSelectedPlayer, userOnClock} = useDraft();
  return <section className="draftV2Workspace">
    <header className="playerPoolHeader">
      <div><span className="eyebrow">Player pool</span><h2>Best available</h2></div>
      <div className="playerPoolFilters">
        <select aria-label="Filter players by position" value={position} onChange={(event) => setPosition(event.target.value)}>
          {["ALL", "QB", "RB", "WR", "TE", "K", "DEF"].map((value) => <option key={value}>{value}</option>)}</select>
        <input aria-label="Search available players" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player" />
      </div>
      <span className="availableCount"><b>{available.length}</b> available</span>
    </header>
    <div className="draftV2PlayerGrid">{filteredPlayers.map((player) => <PlayerCard key={player.name} player={player}
      recommendation={recommendations.find((row) => row.player.name === player.name)}
      selected={selectedPlayer?.name === player.name} disabled={!userOnClock} onSelect={() => setSelectedPlayer(player)} />)}</div>
  </section>;
}
