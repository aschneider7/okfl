import {useDraft} from "../context/DraftContext";
import {ManagerIntel} from "./ManagerIntel";
import {PlayerCard} from "./PlayerCard";
import {RosterPanel} from "./RosterPanel";

export function DraftWorkspace() {
  const {activePanel, setActivePanel, controlledManager, available, filteredPlayers, position, setPosition,
    query, setQuery, recommendations, selectedPlayer, setSelectedPlayer, userOnClock} = useDraft();
  return <section className="draftV2Workspace">
    <div className="draftV2Tabs">
      <button className={activePanel === "players" ? "active" : ""} onClick={() => setActivePanel("players")}>Available Players</button>
      <button className={activePanel === "roster" ? "active" : ""} onClick={() => setActivePanel("roster")}>{controlledManager.manager} Roster</button>
      <button className={activePanel === "intel" ? "active" : ""} onClick={() => setActivePanel("intel")}>Manager Intel</button>
    </div>
    {activePanel === "players" && <div className="draftV2Players"><header><div>
      <select value={position} onChange={(event) => setPosition(event.target.value)}>
        {["ALL", "QB", "RB", "WR", "TE"].map((value) => <option key={value}>{value}</option>)}</select>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player" />
    </div><span>{available.length} players available</span></header>
      <div className="draftV2PlayerGrid">{filteredPlayers.map((player) => <PlayerCard key={player.name} player={player}
        recommendation={recommendations.find((row) => row.player.name === player.name)}
        selected={selectedPlayer?.name === player.name} disabled={!userOnClock} onSelect={() => setSelectedPlayer(player)} />)}</div>
    </div>}
    {activePanel === "roster" && <RosterPanel />}
    {activePanel === "intel" && <ManagerIntel />}
  </section>;
}
