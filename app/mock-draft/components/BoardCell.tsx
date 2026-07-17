import type {DraftManager, DraftPick} from "../types";
import {POSITION_CLASS} from "../types";

export function BoardCell({round, slot, pick, active, manager, controlledFranchise}: {
  round: number; slot: number; pick?: DraftPick; active: boolean; manager: DraftManager; controlledFranchise: string;
}) {
  const classes = ["draftV2Cell", active ? "active" : "", pick?.keeper ? "keeper" : "",
    manager.franchiseId === controlledFranchise ? "controlledColumn" : ""].join(" ");
  return <div className={classes}><span className="draftV2PickLabel">{round}.{slot}</span>
    {pick ? <div className={`draftV2Player ${POSITION_CLASS[pick.player.position] || ""}`}>
      <b>{pick.player.name}</b><small>{pick.player.position} • {pick.player.team}</small>
      <footer><span>{pick.keeper ? `KEEPER R${pick.keeperCost}` : `Grade ${pick.grade}`}</span></footer>
    </div> : <div className="draftV2Empty"><span>{round % 2 === 1 ? "→" : "←"}</span></div>}
  </div>;
}
