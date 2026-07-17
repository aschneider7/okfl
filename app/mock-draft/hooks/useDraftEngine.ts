import {useMemo, useState} from "react";
import {
  DRAFT_ROUNDS, fallbackPprPool, keeperOverall, managers, overallToRoundSlot, projectedKeepers,
} from "@/lib/draftSimulator";
import type {ActivePanel, DraftPick, DraftPlayer} from "../types";
import {useBoard} from "./useBoard";
import {useRecommendations} from "./useRecommendations";
import {createDraftPick, simulateUntilUser} from "./useSimulation";

function buildKeeperPicks(): DraftPick[] {
  return projectedKeepers.map((keeper) => {
    const manager = managers.find((row) => row.franchiseId === keeper.franchiseId)!;
    return {
      overall: keeperOverall(keeper.round, manager.slot), round: keeper.round, slot: manager.slot,
      franchiseId: manager.franchiseId, manager: manager.manager,
      player: {name: keeper.player, position: keeper.position, team: "—", pprRank: 999,
        pprValue: 0, keeperEligible: false, source: "keeper"},
      keeper: true, keeperCost: keeper.round, grade: "K",
      explanation: [`Projected keeper uses ${manager.manager}'s Round ${keeper.round} pick.`],
    };
  });
}

export function useDraftEngine() {
  const [pool] = useState<DraftPlayer[]>(fallbackPprPool);
  const [controlledFranchise, setControlledFranchise] = useState("F01");
  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([]);
  const [overall, setOverall] = useState(1);
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("ALL");
  const [selectedPlayer, setSelectedPlayer] = useState<DraftPlayer | null>(null);
  const [lastMessage, setLastMessage] = useState("Choose a team and press Start Mock.");
  const [activePanel, setActivePanel] = useState<ActivePanel>("players");

  const keepers = useMemo(buildKeeperPicks, []);
  const allPicks = useMemo(() => [...keepers, ...draftPicks], [keepers, draftPicks]);
  const available = useMemo(() => {
    const drafted = new Set(allPicks.map((pick) => pick.player.name.toLowerCase()));
    return pool.filter((player) => !drafted.has(player.name.toLowerCase()));
  }, [allPicks, pool]);
  const current = overall <= DRAFT_ROUNDS * 10 ? overallToRoundSlot(overall) : null;
  const currentManager = current ? managers.find((manager) => manager.slot === current.slot)! : null;
  const controlledManager = managers.find((manager) => manager.franchiseId === controlledFranchise)!;
  const userOnClock = Boolean(started && !complete && currentManager?.franchiseId === controlledFranchise);
  const recommendations = useRecommendations({picks: draftPicks, keepers, overall, available, manager: currentManager});
  const boardState = useBoard({allPicks, available, controlledFranchise, query, position});

  function applySimulation(initialPicks: DraftPick[], initialOverall: number) {
    const result = simulateUntilUser({initialPicks, initialOverall, pool, keepers, controlledFranchise});
    setDraftPicks(result.picks);
    setOverall(result.overall);
    setComplete(result.complete);
    if (result.complete) setLastMessage("Mock draft complete.");
    else {
      const spot = overallToRoundSlot(result.overall);
      setLastMessage(`${controlledManager.manager} is on the clock at ${spot.round}.${spot.slot}.`);
    }
  }

  function startMock() {
    setStarted(true); setComplete(false); setDraftPicks([]); setSelectedPlayer(null);
    applySimulation([], 1);
  }

  function makeUserPick(player: DraftPlayer) {
    if (!userOnClock || !currentManager) return;
    const pick = createDraftPick({player, manager: currentManager, overall, picks: draftPicks, keepers, available});
    setSelectedPlayer(null);
    setLastMessage(`${controlledManager.manager} selected ${player.name} (${pick.grade}).`);
    applySimulation([...draftPicks, pick], overall + 1);
  }

  function undoUserTurn() {
    const last = draftPicks.map((pick, index) => ({pick, index}))
      .filter(({pick}) => pick.franchiseId === controlledFranchise).at(-1);
    if (!last) return;
    setDraftPicks(draftPicks.slice(0, last.index)); setOverall(last.pick.overall);
    setComplete(false); setStarted(true);
    setLastMessage(`Undid ${last.pick.player.name}. ${controlledManager.manager} is back on the clock.`);
  }

  function reset() {
    setDraftPicks([]); setOverall(1); setStarted(false); setComplete(false); setSelectedPlayer(null);
    setLastMessage("Choose a team and press Start Mock.");
  }

  return {
    controlledFranchise, setControlledFranchise, draftPicks, overall, started, complete,
    query, setQuery, position, setPosition, selectedPlayer, setSelectedPlayer,
    lastMessage, activePanel, setActivePanel, keepers, allPicks, available, current,
    currentManager, controlledManager, userOnClock, recommendations, ...boardState,
    startMock, makeUserPick, undoUserTurn, reset,
  };
}

export type DraftEngine = ReturnType<typeof useDraftEngine>;
