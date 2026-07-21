import {draftPlayerKey} from "./draftRankings";
import {fallbackPprPool, managers, overallToRoundSlot, scorePlayer} from "./draftSimulator";
import type {DraftPlayer} from "./draftSimulator";
import type {LiveDraftSnapshot} from "./liveDraft";

export function chooseLiveDraftAiPlayer(snapshot: LiveDraftSnapshot, currentOverall: number): DraftPlayer | null {
  const spot = overallToRoundSlot(currentOverall);
  const manager = managers.find((row) => row.slot === spot.slot);
  if (!manager) return null;
  const drafted = new Set(snapshot.picks.map((pick) => draftPlayerKey(pick.player.name)));
  const available = fallbackPprPool().filter((player) => !drafted.has(draftPlayerKey(player.name)));
  const roster = snapshot.picks.filter((pick) => pick.franchiseId === manager.franchiseId).map((pick) => pick.player);
  const seed = [...snapshot.room.code].reduce((sum, character) => sum + character.charCodeAt(0), 0) + currentOverall * 97;
  return available.sort((a, b) => scorePlayer({player: b, manager, roster, pool: available, round: spot.round, seed}) - scorePlayer({player: a, manager, roster, pool: available, round: spot.round, seed}))[0] || null;
}
