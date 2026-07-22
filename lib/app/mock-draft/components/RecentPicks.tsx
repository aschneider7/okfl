import {useDraft} from "../context/DraftContext";

export function RecentPicks() {
  const {recentPicks} = useDraft();
  return <article className="draftV2Recent"><header><span className="eyebrow">Draft feed</span><h2>Recent picks</h2></header>
    {recentPicks.map((pick) => <div key={pick.overall}><span>{pick.round}.{pick.slot}</span>
      <div><b>{pick.player.name}</b><small>{pick.manager} • {pick.grade}</small></div></div>)}
    {!recentPicks.length && <p>No live selections yet.</p>}
  </article>;
}
