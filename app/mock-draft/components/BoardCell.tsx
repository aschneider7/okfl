import type {DraftManager, DraftPick} from "../types";
import {gradeTone, POSITION_CLASS} from "../types";

export function BoardCell({round, slot, pick, active, manager, controlledFranchise}: {
  round: number; slot: number; pick?: DraftPick; active: boolean; manager: DraftManager; controlledFranchise: string;
}) {
  const classes = ["draftV2Cell", active ? "active" : "", pick?.keeper ? "keeper" : "",
    manager.franchiseId === controlledFranchise ? "controlledColumn" : ""].join(" ");
  const label = pick ? `${round}.${slot}: ${pick.player.name}, ${pick.player.position}, ${manager.manager}`
    : `${round}.${slot}: ${manager.manager}, empty`;
  return <div className={classes} title={label} aria-label={label}><span className="draftV2PickLabel">{round}.{slot}</span>
    {pick ? <div className={`draftV2Player ${POSITION_CLASS[pick.player.position] || ""}`}>
      <b>{pick.player.name}</b><small>{pick.player.position} · {pick.player.team}</small>
      <footer>{pick.keeper
        ? <span className="pickGradeBadge gradeKeeper">K · R{pick.keeperCost}</span>
        : <span className={`pickGradeBadge ${gradeTone(pick.grade)}`} aria-label={`Pick grade ${pick.grade}`}>{pick.grade}</span>}
      </footer>
    </div> : <div className="draftV2Empty"><span>{round % 2 === 1 ? "→" : "←"}</span></div>}
  </div>;
}
