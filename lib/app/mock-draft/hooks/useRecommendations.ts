import {useMemo} from "react";
import {
  overallToRoundSlot, pprAdjustedRank, scorePlayer, teamRoster,
} from "@/lib/draftSimulator";
import type {DraftManager, DraftMode, DraftPick, DraftPlayer, Recommendation} from "../types";

export function rankRecommendations(params: {
  picks: DraftPick[];
  keepers: DraftPick[];
  overall: number;
  available: DraftPlayer[];
  manager: DraftManager;
  simulationSeed: number;
  draftMode: DraftMode;
}): Recommendation[] {
  const {picks, keepers, overall, available, manager, simulationSeed, draftMode} = params;
  const {round} = overallToRoundSlot(overall);
  const roster = teamRoster([...keepers, ...picks], manager.franchiseId);
  return available
    .map((player) => ({
      player,
      score: scorePlayer({player, manager, roster, pool: available, round, seed: simulationSeed + overall * 97, mode: draftMode}),
    }))
    .sort((a, b) => b.score - a.score || pprAdjustedRank(a.player) - pprAdjustedRank(b.player));
}

export function useRecommendations(params: {
  picks: DraftPick[];
  keepers: DraftPick[];
  overall: number;
  available: DraftPlayer[];
  manager: DraftManager | null;
  simulationSeed: number;
  draftMode: DraftMode;
}) {
  const {picks, keepers, overall, available, manager, simulationSeed, draftMode} = params;
  return useMemo(
    () => manager ? rankRecommendations({picks, keepers, overall, available, manager, simulationSeed, draftMode}).slice(0, 8) : [],
    [picks, keepers, overall, available, manager, simulationSeed, draftMode],
  );
}
