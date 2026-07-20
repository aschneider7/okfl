import {OKFL_QB_PREMIUM_PICKS} from "@/lib/draftSimulator";
import {useDraft} from "../context/DraftContext";
import {DraftControls} from "./DraftControls";

export function DraftHeader() {
  const {started, controlledManager, lastMessage, overall, complete, paused, isSimulating, draftMode} = useDraft();
  return <>
    <section className="draftV2Setup">
      <div className="draftV2Brand"><span className="eyebrow">OKFL Draft Room <i>V4</i></span>
        <h2>{started ? `${controlledManager.manager}'s Draft Room` : "Choose your franchise"}</h2><p>{lastMessage}</p>
      </div>
      <div className="draftHeaderStatus" aria-label="Draft progress">
        <span>{complete ? "Final" : paused ? "Paused" : isSimulating ? "AI selecting" : started ? "Live mock" : "Pre-draft"}</span>
        <b>{complete ? "Complete" : `Pick ${overall} of 170`}</b>
      </div>
      <DraftControls />
    </section>
    <section className="draftV2Identity">
      <div className="identityBadge">{controlledManager.slot}</div>
      <div><span>{controlledManager.archetype}</span><b>{controlledManager.manager}</b><p>“{controlledManager.motto}”</p></div>
      <div className="identityMeters">
        <div><span>QB urgency</span><i><b style={{width: `${controlledManager.tendencies.qbAggression * 100}%`}} /></i></div>
        <div><span>Keeper focus</span><i><b style={{width: `${controlledManager.tendencies.keeperFocus * 100}%`}} /></i></div>
        <div><span>Risk</span><i><b style={{width: `${controlledManager.tendencies.risk * 100}%`}} /></i></div>
      </div>
      <div className="draftV2ModelNote"><b>{draftMode[0].toUpperCase() + draftMode.slice(1)} simulation</b><span>PPR board • {OKFL_QB_PREMIUM_PICKS}-pick QB adjustment</span></div>
    </section>
  </>;
}
