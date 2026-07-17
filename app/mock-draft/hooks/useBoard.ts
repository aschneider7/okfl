import {useMemo} from "react";
import {pprAdjustedRank} from "@/lib/draftSimulator";
import type {DraftPick, DraftPlayer} from "../types";
import {pickKey} from "../types";

export function useBoard(params: {
  allPicks: DraftPick[];
  available: DraftPlayer[];
  controlledFranchise: string;
  query: string;
  position: string;
}) {
  const {allPicks, available, controlledFranchise, query, position} = params;
  return useMemo(() => {
    const board = new Map<string, DraftPick>();
    allPicks.forEach((pick) => board.set(pickKey(pick.round, pick.slot), pick));
    const normalizedQuery = query.trim().toLowerCase();
    return {
      board,
      filteredPlayers: available
        .filter((player) => position === "ALL" || player.position === position)
        .filter((player) => !normalizedQuery || player.name.toLowerCase().includes(normalizedQuery))
        .sort((a, b) => pprAdjustedRank(a) - pprAdjustedRank(b))
        .slice(0, 100),
      controlledRoster: allPicks
        .filter((pick) => pick.franchiseId === controlledFranchise)
        .sort((a, b) => a.overall - b.overall),
      recentPicks: [...allPicks]
        .filter((pick) => !pick.keeper)
        .sort((a, b) => b.overall - a.overall)
        .slice(0, 8),
    };
  }, [allPicks, available, controlledFranchise, query, position]);
}
