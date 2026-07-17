import {pprAdjustedRank, pprAdjustedValue} from "@/lib/draftSimulator";
import type {DraftPlayer, Recommendation} from "../types";
import {POSITION_CLASS} from "../types";

export function PlayerCard({player, recommendation, selected, disabled, onSelect}: {
  player: DraftPlayer; recommendation?: Recommendation; selected: boolean; disabled: boolean; onSelect: () => void;
}) {
  return <button className={selected ? "selected" : ""} disabled={disabled} onClick={onSelect}>
    <div className={`playerPosition ${POSITION_CLASS[player.position] || ""}`}>{player.position}</div>
    <div className="playerCardIdentity"><b>{player.name}</b><span>{player.team} • Age {player.age || "—"}</span></div>
    <div className="playerRanks"><span>PPR <b>{player.pprRank}</b></span><span>OKFL <b>{pprAdjustedRank(player)}</b></span></div>
    <strong>{Math.round(recommendation?.score ?? pprAdjustedValue(player))}</strong>
  </button>;
}
