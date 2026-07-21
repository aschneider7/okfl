import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
  DRAFT_ROUNDS, draftReport, fallbackPprPool, keeperOverall, managers, overallToRoundSlot, projectedKeepers,
} from "@/lib/draftSimulator";
import {draftPlayerKey, fallbackRankingsMeta, type DraftRankingsMeta, type DraftRankingsResponse} from "@/lib/draftRankings";
import type {DraftMode, DraftPick, DraftPlayer, SimulationSpeed} from "../types";
import {useBoard} from "./useBoard";
import {useRecommendations} from "./useRecommendations";
import {chooseAiPlayer, createDraftPick, SIMULATION_DELAYS} from "./useSimulation";

const TOTAL_PICKS = DRAFT_ROUNDS * 10;
const STORAGE_KEY = "okfl:draft-room:v3.2";

type SavedDraft = {
  version: 1; controlledFranchise: string; draftPicks: DraftPick[]; overall: number;
  started: boolean; complete: boolean; simulationSeed: number; simulationSpeed: SimulationSpeed;
  draftMode: DraftMode; paused: boolean; watchlist: string[]; queue: string[]; savedAt: string;
};

function buildKeeperPicks(): DraftPick[] {
  return projectedKeepers.map((keeper) => {
    const manager = managers.find((row) => row.franchiseId === keeper.franchiseId)!;
    return {
      overall: keeperOverall(keeper.round, manager.slot), round: keeper.round, slot: manager.slot,
      franchiseId: manager.franchiseId, manager: manager.manager,
      player: {name: keeper.player, position: keeper.position, team: "—", pprRank: 999, pprValue: 0, keeperEligible: false, source: "keeper"},
      keeper: true, keeperCost: keeper.round, grade: "K",
      explanation: [`Projected keeper uses ${manager.manager}'s Round ${keeper.round} pick.`],
    };
  });
}

function newSimulationSeed() { return Math.floor(Math.random() * 2_147_483_647) + 1; }

export function useDraftEngine() {
  const [pool, setPool] = useState<DraftPlayer[]>(fallbackPprPool);
  const [rankingsMeta, setRankingsMeta] = useState<DraftRankingsMeta>(() => fallbackRankingsMeta(fallbackPprPool()));
  const [rankingsLoading, setRankingsLoading] = useState(true);
  const [controlledFranchise, setControlledFranchise] = useState("F01");
  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([]);
  const [overall, setOverall] = useState(1); const [started, setStarted] = useState(false); const [complete, setComplete] = useState(false);
  const [query, setQuery] = useState(""); const [position, setPosition] = useState("ALL");
  const [selectedPlayer, setSelectedPlayer] = useState<DraftPlayer | null>(null);
  const [lastMessage, setLastMessage] = useState("Choose a team and press Start Mock.");
  const [simulationSeed, setSimulationSeed] = useState(1); const [simulationSpeed, setSimulationSpeed] = useState<SimulationSpeed>("normal");
  const [draftMode, setDraftMode] = useState<DraftMode>("realistic"); const [paused, setPaused] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]); const [queue, setQueue] = useState<string[]>([]);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const startedRef = useRef(started);
  startedRef.current = started;

  const keepers = useMemo(buildKeeperPicks, []);
  const allPicks = useMemo(() => [...keepers, ...draftPicks], [keepers, draftPicks]);
  const available = useMemo(() => {
    const drafted = new Set(allPicks.map((pick) => draftPlayerKey(pick.player.name)));
    return pool.filter((player) => !drafted.has(draftPlayerKey(player.name)));
  }, [allPicks, pool]);
  const current = overall <= TOTAL_PICKS ? overallToRoundSlot(overall) : null;
  const currentManager = current ? managers.find((manager) => manager.slot === current.slot)! : null;
  const controlledManager = managers.find((manager) => manager.franchiseId === controlledFranchise)!;
  const currentKeeper = keepers.find((pick) => pick.overall === overall);
  const userOnClock = Boolean(started && !complete && !currentKeeper && currentManager?.franchiseId === controlledFranchise);
  const isSimulating = Boolean(started && !complete && !paused && currentManager && !userOnClock);
  const recommendations = useRecommendations({picks: draftPicks, keepers, overall, available, manager: currentManager, simulationSeed, draftMode});
  const boardState = useBoard({allPicks, available, controlledFranchise, query, position});
  const availableNames = useMemo(() => new Set(available.map((player) => player.name)), [available]);
  const queuedPlayers = queue.filter((name) => availableNames.has(name)).map((name) => available.find((player) => player.name === name)!).filter(Boolean);
  const watchedPlayers = watchlist.filter((name) => availableNames.has(name)).map((name) => available.find((player) => player.name === name)!).filter(Boolean);
  const report = useMemo(() => draftReport(allPicks, controlledFranchise), [allPicks, controlledFranchise]);

  const refreshRankings = useCallback(async () => {
    if (started) return;
    setRankingsLoading(true);
    try {
      const response = await fetch("/api/draft/rankings", {cache: "no-store"});
      if (!response.ok) throw new Error(`Rankings request failed with ${response.status}.`);
      const result = await response.json() as DraftRankingsResponse;
      if (!Array.isArray(result.players) || result.players.length < 170 || !result.meta) throw new Error("Rankings response was incomplete.");
      if (startedRef.current) return;
      setPool(result.players); setRankingsMeta(result.meta);
      setLastMessage(result.meta.source === "live"
        ? `Live PPR market loaded: ${result.meta.playerCount} players with kickers and defenses.`
        : "Live rankings are unavailable, so the protected OKFL board is loaded.");
    } catch (error) {
      if (startedRef.current) return;
      const fallback = fallbackPprPool();
      setPool(fallback); setRankingsMeta(fallbackRankingsMeta(fallback, error instanceof Error ? error.message : undefined));
      setLastMessage("Live rankings are unavailable, so the protected OKFL board is loaded.");
    } finally { setRankingsLoading(false); }
  }, [started]);

  useEffect(() => { void refreshRankings(); }, [refreshRankings]);

  useEffect(() => { setHasSavedDraft(Boolean(window.localStorage.getItem(STORAGE_KEY))); }, []);
  useEffect(() => {
    if (!started) return;
    const saved: SavedDraft = {version: 1, controlledFranchise, draftPicks, overall, started, complete, simulationSeed, simulationSpeed, draftMode, paused, watchlist, queue, savedAt: new Date().toISOString()};
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); setHasSavedDraft(true);
  }, [complete, controlledFranchise, draftMode, draftPicks, overall, paused, queue, simulationSeed, simulationSpeed, started, watchlist]);

  useEffect(() => {
    if (!userOnClock || selectedPlayer || !queuedPlayers.length) return;
    setSelectedPlayer(queuedPlayers[0]); setLastMessage(`${queuedPlayers[0].name} is first in your queue and ready to confirm.`);
  }, [queuedPlayers, selectedPlayer, userOnClock]);

  useEffect(() => {
    if (!isSimulating || !currentManager) return;
    const keeper = currentKeeper;
    const delay = keeper ? Math.min(120, SIMULATION_DELAYS[simulationSpeed]) : SIMULATION_DELAYS[simulationSpeed];
    const timer = window.setTimeout(() => {
      const nextOverall = overall + 1;
      if (keeper) setLastMessage(`${keeper.manager}'s Round ${keeper.round} keeper is locked in: ${keeper.player.name}.`);
      else {
        const player = chooseAiPlayer({picks: draftPicks, keepers, overall, available, manager: currentManager, simulationSeed, draftMode});
        if (!player) { setComplete(true); setLastMessage("Mock draft complete."); return; }
        const pick = createDraftPick({player, manager: currentManager, overall, picks: draftPicks, keepers, available});
        setDraftPicks((rows) => [...rows, pick]); setLastMessage(`${currentManager.manager} selected ${player.name} at ${pick.round}.${pick.slot}.`);
      }
      setOverall(nextOverall);
      if (nextOverall > TOTAL_PICKS) { setComplete(true); setLastMessage("Mock complete. Your draft grade is ready."); }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [available, currentKeeper, currentManager, draftMode, draftPicks, isSimulating, keepers, overall, simulationSeed, simulationSpeed]);

  function startMock() {
    setSimulationSeed(newSimulationSeed()); setStarted(true); setComplete(false); setPaused(false); setDraftPicks([]); setOverall(1); setSelectedPlayer(null);
    setLastMessage(`${draftMode[0].toUpperCase()}${draftMode.slice(1)} mode is live. AI managers are making their selections.`);
  }
  function resumeMock() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as SavedDraft | null;
      if (!saved || saved.version !== 1 || !Array.isArray(saved.draftPicks)) throw new Error("Invalid saved mock");
      setControlledFranchise(saved.controlledFranchise); setDraftPicks(saved.draftPicks); setOverall(saved.overall); setStarted(true);
      setComplete(Boolean(saved.complete)); setSimulationSeed(saved.simulationSeed); setSimulationSpeed(saved.simulationSpeed);
      setDraftMode(saved.draftMode); setPaused(true); setWatchlist(saved.watchlist || []); setQueue(saved.queue || []); setSelectedPlayer(null);
      setLastMessage(saved.complete ? "Saved mock restored. Your final grade is ready." : "Saved mock restored and paused.");
    } catch { window.localStorage.removeItem(STORAGE_KEY); setHasSavedDraft(false); setLastMessage("The saved mock was invalid and has been cleared."); }
  }
  function makeUserPick(player: DraftPlayer) {
    if (!userOnClock || !currentManager) return;
    const pick = createDraftPick({player, manager: currentManager, overall, picks: draftPicks, keepers, available}); const nextOverall = overall + 1;
    setDraftPicks((rows) => [...rows, pick]); setQueue((rows) => rows.filter((name) => name !== player.name)); setWatchlist((rows) => rows.filter((name) => name !== player.name));
    setSelectedPlayer(null); setLastMessage(`${controlledManager.manager} selected ${player.name} (${pick.grade}).`); setOverall(nextOverall);
    if (nextOverall > TOTAL_PICKS) setComplete(true);
  }
  function undoUserTurn() {
    const last = draftPicks.map((pick, index) => ({pick, index})).filter(({pick}) => pick.franchiseId === controlledFranchise).at(-1);
    if (!last) return;
    setDraftPicks(draftPicks.slice(0, last.index)); setOverall(last.pick.overall); setComplete(false); setPaused(false); setStarted(true); setSelectedPlayer(null);
    setLastMessage(`Undid ${last.pick.player.name}. ${controlledManager.manager} is back on the clock.`);
  }
  function reset() {
    setDraftPicks([]); setOverall(1); setStarted(false); setComplete(false); setPaused(false); setSelectedPlayer(null); setWatchlist([]); setQueue([]);
    window.localStorage.removeItem(STORAGE_KEY); setHasSavedDraft(false); setLastMessage("Choose a team and press Start Mock.");
  }
  function togglePause() { setPaused((value) => { setLastMessage(value ? "AI simulation resumed." : "Draft simulation paused."); return !value; }); }
  function toggleWatchlist(player: DraftPlayer) { setWatchlist((rows) => rows.includes(player.name) ? rows.filter((name) => name !== player.name) : [...rows, player.name]); }
  function toggleQueue(player: DraftPlayer) { setQueue((rows) => rows.includes(player.name) ? rows.filter((name) => name !== player.name) : [...rows, player.name]); }
  async function shareRecap() {
    const firstPicks = boardState.controlledRoster.filter((pick) => !pick.keeper).slice(0, 5).map((pick) => `${pick.round}.${pick.slot} ${pick.player.name}`).join(", ");
    const recap = `${controlledManager.manager}'s OKFL mock: ${report.grade} (${report.score}/100), ${report.steals} value picks, ${report.coverage}% starter coverage. First picks: ${firstPicks}.`;
    const canShare = typeof navigator.share === "function";
    if (canShare) await navigator.share({title: "OKFL Mock Draft Recap", text: recap}); else await navigator.clipboard.writeText(recap);
    setLastMessage(canShare ? "Draft recap shared." : "Draft recap copied.");
  }

  return {
    controlledFranchise, setControlledFranchise, draftPicks, overall, started, complete, query, setQuery, position, setPosition,
    selectedPlayer, setSelectedPlayer, lastMessage, keepers, allPicks, available, current, currentManager, controlledManager,
    userOnClock, isSimulating, recommendations, simulationSpeed, setSimulationSpeed, draftMode, setDraftMode, paused,
    watchlist, queue, watchedPlayers, queuedPlayers, toggleWatchlist, toggleQueue, hasSavedDraft, report,
    rankingsMeta, rankingsLoading, refreshRankings,
    ...boardState, startMock, resumeMock, makeUserPick, undoUserTurn, reset, togglePause, shareRecap,
  };
}

export type DraftEngine = ReturnType<typeof useDraftEngine>;
