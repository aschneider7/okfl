import {explainPick, overallToRoundSlot, pickGrade, teamRoster} from "@/lib/draftSimulator";
import {DRAFT_ROUNDS, managers} from "@/lib/draftSimulator";
import type {DraftManager, DraftPick, DraftPlayer} from "../types";
import {rankRecommendations} from "./useRecommendations";

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

export function simulateUntilUser(params: {
  initialPicks: DraftPick[];
  initialOverall: number;
  pool: DraftPlayer[];
  keepers: DraftPick[];
  controlledFranchise: string;
}) {
  const {pool, keepers, controlledFranchise} = params;
  let picks = [...params.initialPicks];
  let overall = params.initialOverall;
  let available = pool.filter((player) => ![...keepers, ...picks].some(
    (pick) => pick.player.name.toLowerCase() === player.name.toLowerCase(),
  ));

  while (overall <= DRAFT_ROUNDS * 10) {
    if (keepers.some((pick) => pick.overall === overall)) {
      overall += 1;
      continue;
    }
    const spot = overallToRoundSlot(overall);
    const manager = managers.find((row) => row.slot === spot.slot)!;
    if (manager.franchiseId === controlledFranchise) break;
    const player = rankRecommendations({picks, keepers, overall, available, manager})[0]?.player;
    if (!player) break;
    picks.push(createDraftPick({player, manager, overall, picks, keepers, available}));
    available = available.filter((row) => row.name !== player.name);
    overall += 1;
  }

  return {picks, overall, complete: overall > DRAFT_ROUNDS * 10};
}
