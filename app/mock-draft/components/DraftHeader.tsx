import {OKFL_QB_PREMIUM_PICKS} from "@/lib/draftSimulator";
import {useDraft} from "../context/DraftContext";
import {DraftControls} from "./DraftControls";

export function DraftHeader() {
  const {started, controlledManager, lastMessage} = useDraft();
  return <>
    <section className="draftV2Setup">
      <div className="draftV2Brand"><span className="eyebrow">Mock Draft 2.0</span>
        <h2>{started ? `${controlledManager.manager}'s Draft Room` : "Choose your franchise"}</h2><p>{lastMessage}</p>
      </div><DraftControls />
    </section>
    <section className="draftV2Identity">
      <div className="identityBadge">{controlledManager.slot}</div>
      <div><span>{controlledManager.archetype}</span><b>{controlledManager.manager}</b><p>“{controlledManager.motto}”</p></div>
      <div className="identityMeters">
        <div><span>QB urgency</span><i><b style={{width: `${controlledManager.tendencies.qbAggression * 100}%`}} /></i></div>
        <div><span>Keeper focus</span><i><b style={{width: `${controlledManager.tendencies.keeperFocus * 100}%`}} /></i></div>
        <div><span>Risk</span><i><b style={{width: `${controlledManager.tendencies.risk * 100}%`}} /></i></div>
      </div>
      <div className="draftV2ModelNote"><b>PPR-first model</b><span>QBs move only {OKFL_QB_PREMIUM_PICKS} picks above their PPR rank.</span></div>
    </section>
  </>;
}
