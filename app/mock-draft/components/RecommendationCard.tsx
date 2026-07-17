import {pprAdjustedRank} from "@/lib/draftSimulator";
import type {Recommendation} from "../types";

export function RecommendationCard({recommendation, rank, disabled, onSelect}: {
  recommendation: Recommendation; rank: number; disabled: boolean; onSelect: () => void;
}) {
  const {player, score} = recommendation;
  return <button disabled={disabled} onClick={onSelect}><span>{rank}</span><div><b>{player.name}</b>
    <small>{player.position} • PPR {player.pprRank}{player.position === "QB" ? ` → OKFL ${pprAdjustedRank(player)}` : ""}</small>
  </div><strong>{Math.round(score)}</strong></button>;
}
