import {pprAdjustedRank, pprAdjustedValue} from "@/lib/draftSimulator";
import type {DraftPlayer, Recommendation} from "../types";
import {POSITION_CLASS} from "../types";

export function PlayerCard({player, recommendation, selected, disabled, watched, queued, onSelect, onWatch, onQueue}: {
  player: DraftPlayer; recommendation?: Recommendation; selected: boolean; disabled: boolean; watched: boolean; queued: boolean;
  onSelect: () => void; onWatch: () => void; onQueue: () => void;
}) {
  return <article className={`draftPlayerCard ${selected ? "selected" : ""}`}>
    <button className="draftPlayerMain" disabled={disabled} onClick={onSelect}>
      <div className={`playerPosition ${POSITION_CLASS[player.position] || ""}`}>{player.position}</div>
      <div className="playerCardIdentity"><b>{player.name}</b><span>{player.team} • Age {player.age || "—"}</span></div>
      <div className="playerRanks"><span>PPR <b>{player.pprRank}</b></span><span>OKFL <b>{pprAdjustedRank(player)}</b></span></div>
      <strong>{Math.round(recommendation?.score ?? pprAdjustedValue(player))}</strong>
    </button>
    <div className="draftPlayerActions"><button type="button" className={watched ? "active" : ""} aria-pressed={watched} onClick={onWatch}>{watched ? "★" : "☆"}<span>Watch</span></button>
      <button type="button" className={queued ? "active" : ""} aria-pressed={queued} onClick={onQueue}>{queued ? "Queued" : "+ Queue"}</button></div>
  </article>;
}
