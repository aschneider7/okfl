import {useDraft} from "../context/DraftContext";

export function RosterPanel() {
  const {controlledRoster} = useDraft();
  return <div className="draftV2Roster">{["QB", "RB", "WR", "TE", "K", "DEF"].map((position) => {
    const picks = controlledRoster.filter((pick) => pick.player.position === position);
    return <section key={position}><header><b>{position}</b><span>{picks.length}</span></header>
      {picks.map((pick) => <div key={`${pick.overall}-${pick.player.name}`}><b>{pick.player.name}</b>
        <span>{pick.keeper ? `Keeper • Round ${pick.keeperCost}` : `Pick ${pick.round}.${pick.slot} • ${pick.grade}`}</span></div>)}
      {!picks.length && <p>No players yet.</p>}
    </section>;
  })}</div>;
}
