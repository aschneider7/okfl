import {useDraft} from "../context/DraftContext";

export function StrategyPanel() {
  const {queuedPlayers, watchedPlayers, setSelectedPlayer, toggleQueue, toggleWatchlist, userOnClock} = useDraft();
  return <div className="draftStrategyPanel">
    <header><span className="eyebrow">Your strategy</span><h2>Queue & watchlist</h2></header>
    <section><div><b>Pick queue</b><span>Auto-surfaces your first available player.</span></div>
      {queuedPlayers.map((player, index) => <article key={player.name}><span>{index + 1}</span><button disabled={!userOnClock} onClick={() => setSelectedPlayer(player)}><b>{player.name}</b><small>{player.position} • PPR {player.pprRank}</small></button><button aria-label={`Remove ${player.name} from queue`} onClick={() => toggleQueue(player)}>×</button></article>)}
      {!queuedPlayers.length && <p>Add players from the player pool.</p>}
    </section>
    <section><div><b>Watchlist</b><span>Track sleepers without committing.</span></div>
      {watchedPlayers.map((player) => <article key={player.name}><span>★</span><button disabled={!userOnClock} onClick={() => setSelectedPlayer(player)}><b>{player.name}</b><small>{player.position} • PPR {player.pprRank}</small></button><button aria-label={`Remove ${player.name} from watchlist`} onClick={() => toggleWatchlist(player)}>×</button></article>)}
      {!watchedPlayers.length && <p>Star players to watch them here.</p>}
    </section>
  </div>;
}
