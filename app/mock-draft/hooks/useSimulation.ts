import {explainPick, overallToRoundSlot, pickGrade, teamRoster} from "@/lib/draftSimulator";
import type {DraftManager, DraftMode, DraftPick, DraftPlayer, SimulationSpeed} from "../types";
import {rankRecommendations} from "./useRecommendations";

export const SIMULATION_DELAYS: Record<SimulationSpeed, number> = {normal: 320, turbo: 55};

export function createDraftPick(params: {
  player: DraftPlayer;
  manager: DraftManager;
  overall: number;
  picks: DraftPick[];
  keepers: DraftPick[];
  available: DraftPlayer[];
}): DraftPick {
  const {player, manager, overall, picks, keepers, available} = params;
  const spot = overallToRoundSlot(overall);
  const roster = teamRoster([...keepers, ...picks], manager.franchiseId);
  return {
    overall,
    round: spot.round,
    slot: spot.slot,
    franchiseId: manager.franchiseId,
    manager: manager.manager,
    player,
    keeper: false,
    grade: pickGrade(player, overall),
    explanation: explainPick({player, manager, roster, pool: available, round: spot.round}),
  };
}

export function chooseAiPlayer(params: {
  picks: DraftPick[];
  keepers: DraftPick[];
  overall: number;
  available: DraftPlayer[];
  manager: DraftManager;
  simulationSeed: number;
  draftMode: DraftMode;
}) {
  return rankRecommendations(params)[0]?.player ?? null;
}
