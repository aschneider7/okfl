import {useDraft} from "../context/DraftContext";
import {gradeTone} from "../types";

export function RecentPicks() {
  const {recentPicks} = useDraft();
  return <article className="draftV2Recent"><header><span className="eyebrow">Draft feed</span><h2>Recent picks</h2></header>
    {recentPicks.map((pick) => <div key={pick.overall}><span>{pick.round}.{pick.slot}</span>
      <div><b>{pick.player.name}</b><small>{pick.manager}<i className={`inlineGrade ${gradeTone(pick.grade)}`}>{pick.grade}</i></small></div></div>)}
    {!recentPicks.length && <p>No live selections yet.</p>}
  </article>;
}
