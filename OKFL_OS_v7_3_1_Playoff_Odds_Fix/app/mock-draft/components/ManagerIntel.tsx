import {managers} from "@/lib/draftSimulator";
import {useDraft} from "../context/DraftContext";

export function ManagerIntel() {
  const {controlledFranchise} = useDraft();
  return <div className="draftV2Intel">{managers.map((manager) => <article
    className={manager.franchiseId === controlledFranchise ? "controlled" : ""} key={manager.franchiseId}>
    <span>Pick {manager.slot}</span><h3>{manager.manager}</h3><b>{manager.archetype}</b><p>{manager.motto}</p>
    <div><small>QB {Math.round(manager.tendencies.qbAggression * 100)}</small>
      <small>Youth {Math.round(manager.tendencies.youth * 100)}</small><small>Risk {Math.round(manager.tendencies.risk * 100)}</small></div>
  </article>)}</div>;
}
