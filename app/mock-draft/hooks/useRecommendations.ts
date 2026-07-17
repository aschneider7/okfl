import {useMemo} from "react";
import {
  overallToRoundSlot, pprAdjustedRank, scorePlayer, teamRoster,
} from "@/lib/draftSimulator";
import type {DraftManager, DraftPick, DraftPlayer, Recommendation} from "../types";

export function rankRecommendations(params: {
  picks: DraftPick[];
  keepers: DraftPick[];
  overall: number;
  available: DraftPlayer[];
  manager: DraftManager;
}): Recommendation[] {
  const {picks, keepers, overall, available, manager} = params;
  const {round} = overallToRoundSlot(overall);
  const roster = teamRoster([...keepers, ...picks], manager.franchiseId);
  return available
    .map((player) => ({
      player,
      score: scorePlayer({player, manager, roster, pool: available, round, seed: overall}),
    }))
    .sort((a, b) => b.score - a.score || pprAdjustedRank(a.player) - pprAdjustedRank(b.player));
}

export function useRecommendations(params: {
  picks: DraftPick[];
  keepers: DraftPick[];
  overall: number;
  available: DraftPlayer[];
  manager: DraftManager | null;
}) {
  const {picks, keepers, overall, available, manager} = params;
  return useMemo(
    () => manager ? rankRecommendations({picks, keepers, overall, available, manager}).slice(0, 8) : [],
    [picks, keepers, overall, available, manager],
  );
}
