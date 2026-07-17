import {pprAdjustedRank} from "@/lib/draftSimulator";
import {useDraft} from "../context/DraftContext";
import {POSITION_CLASS} from "../types";

export function StatusBar() {
  const {selectedPlayer, setSelectedPlayer, userOnClock, makeUserPick} = useDraft();
  if (!selectedPlayer || !userOnClock) return null;
  return <div className="draftV2SelectionBar">
    <div className={`selectionPosition ${POSITION_CLASS[selectedPlayer.position] || ""}`}>{selectedPlayer.position}</div>
    <div><span>Selected player</span><b>{selectedPlayer.name}</b>
      <small>PPR rank {selectedPlayer.pprRank} • OKFL-adjusted rank {pprAdjustedRank(selectedPlayer)}</small></div>
    <button onClick={() => setSelectedPlayer(null)}>Cancel</button>
    <button className="draftPlayerButton" onClick={() => makeUserPick(selectedPlayer)}>Draft {selectedPlayer.name}</button>
  </div>;
}
