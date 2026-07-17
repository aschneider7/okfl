import {useEffect, useMemo, useState} from "react";
import {
  DRAFT_ROUNDS, fallbackPprPool, keeperOverall, managers, overallToRoundSlot, projectedKeepers,
} from "@/lib/draftSimulator";
import type {DraftPick, DraftPlayer, SimulationSpeed} from "../types";
import {useBoard} from "./useBoard";
import {useRecommendations} from "./useRecommendations";
import {chooseAiPlayer, createDraftPick, SIMULATION_DELAYS} from "./useSimulation";

const TOTAL_PICKS = DRAFT_ROUNDS * 10;

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

function newSimulationSeed() {
  return Math.floor(Math.random() * 2_147_483_647) + 1;
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
  const [simulationSeed, setSimulationSeed] = useState(1);
  const [simulationSpeed, setSimulationSpeed] = useState<SimulationSpeed>("normal");
  const [paused, setPaused] = useState(false);

  const keepers = useMemo(buildKeeperPicks, []);
  const allPicks = useMemo(() => [...keepers, ...draftPicks], [keepers, draftPicks]);
  const available = useMemo(() => {
    const drafted = new Set(allPicks.map((pick) => pick.player.name.toLowerCase()));
    return pool.filter((player) => !drafted.has(player.name.toLowerCase()));
  }, [allPicks, pool]);
  const current = overall <= TOTAL_PICKS ? overallToRoundSlot(overall) : null;
  const currentManager = current ? managers.find((manager) => manager.slot === current.slot)! : null;
  const controlledManager = managers.find((manager) => manager.franchiseId === controlledFranchise)!;
  const userOnClock = Boolean(started && !complete && currentManager?.franchiseId === controlledFranchise);
  const isSimulating = Boolean(started && !complete && !paused && currentManager && !userOnClock);
  const recommendations = useRecommendations({
    picks: draftPicks, keepers, overall, available, manager: currentManager, simulationSeed,
  });
  const boardState = useBoard({allPicks, available, controlledFranchise, query, position});

  useEffect(() => {
    if (!isSimulating || !currentManager) return;
    const keeper = keepers.find((pick) => pick.overall === overall);
    const delay = keeper ? Math.min(120, SIMULATION_DELAYS[simulationSpeed]) : SIMULATION_DELAYS[simulationSpeed];
    const timer = window.setTimeout(() => {
      const nextOverall = overall + 1;
      if (keeper) {
        setLastMessage(`${keeper.manager}'s Round ${keeper.round} keeper is locked in: ${keeper.player.name}.`);
      } else {
        const player = chooseAiPlayer({
          picks: draftPicks, keepers, overall, available, manager: currentManager, simulationSeed,
        });
        if (!player) {
          setComplete(true);
          setLastMessage("Mock draft complete.");
          return;
        }
        const pick = createDraftPick({player, manager: currentManager, overall, picks: draftPicks, keepers, available});
        setDraftPicks((rows) => [...rows, pick]);
        setLastMessage(`${currentManager.manager} selected ${player.name} at ${pick.round}.${pick.slot}.`);
      }
      setOverall(nextOverall);
      if (nextOverall > TOTAL_PICKS) {
        setComplete(true);
        setLastMessage("Mock draft complete.");
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [available, currentManager, draftPicks, isSimulating, keepers, overall, simulationSeed, simulationSpeed]);

  function startMock() {
    setSimulationSeed(newSimulationSeed());
    setStarted(true); setComplete(false); setPaused(false); setDraftPicks([]); setOverall(1); setSelectedPlayer(null);
    setLastMessage("The draft is live. AI managers are making their selections.");
  }

  function makeUserPick(player: DraftPlayer) {
    if (!userOnClock || !currentManager) return;
    const pick = createDraftPick({player, manager: currentManager, overall, picks: draftPicks, keepers, available});
    const nextOverall = overall + 1;
    setDraftPicks((rows) => [...rows, pick]);
    setSelectedPlayer(null);
    setLastMessage(`${controlledManager.manager} selected ${player.name} (${pick.grade}).`);
    setOverall(nextOverall);
    if (nextOverall > TOTAL_PICKS) setComplete(true);
  }

  function undoUserTurn() {
    const last = draftPicks.map((pick, index) => ({pick, index}))
      .filter(({pick}) => pick.franchiseId === controlledFranchise).at(-1);
    if (!last) return;
    setDraftPicks(draftPicks.slice(0, last.index)); setOverall(last.pick.overall);
    setComplete(false); setPaused(false); setStarted(true); setSelectedPlayer(null);
    setLastMessage(`Undid ${last.pick.player.name}. ${controlledManager.manager} is back on the clock.`);
  }

  function reset() {
    setDraftPicks([]); setOverall(1); setStarted(false); setComplete(false); setPaused(false); setSelectedPlayer(null);
    setLastMessage("Choose a team and press Start Mock.");
  }

  function togglePause() {
    setPaused((value) => {
      setLastMessage(value ? "AI simulation resumed." : "Draft simulation paused.");
      return !value;
    });
  }

  return {
    controlledFranchise, setControlledFranchise, draftPicks, overall, started, complete,
    query, setQuery, position, setPosition, selectedPlayer, setSelectedPlayer,
    lastMessage, keepers, allPicks, available, current, currentManager, controlledManager,
    userOnClock, isSimulating, recommendations, simulationSpeed, setSimulationSpeed, paused,
    ...boardState, startMock, makeUserPick, undoUserTurn, reset, togglePause,
  };
}

export type DraftEngine = ReturnType<typeof useDraftEngine>;
