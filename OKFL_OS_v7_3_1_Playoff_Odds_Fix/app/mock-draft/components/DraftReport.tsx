import {useDraft} from "../context/DraftContext";

export function DraftReport() {
  const {complete, report, controlledManager, controlledRoster, shareRecap} = useDraft();
  if (!complete) return null;
  const best = controlledRoster.filter((pick) => !pick.keeper).sort((a, b) => ({"A+": 6, A: 5, "B+": 4, B: 3, C: 2, D: 1}[b.grade || "C"] || 0) - ({"A+": 6, A: 5, "B+": 4, B: 3, C: 2, D: 1}[a.grade || "C"] || 0))[0];
  return <section className="draftReport"><div className="draftReportGrade"><span>Final grade</span><b>{report.grade}</b><strong>{report.score}/100</strong></div>
    <div><span className="eyebrow">Post-draft report</span><h2>{controlledManager.manager} built a {report.grade} roster</h2><p>The grade combines pick value, starting-lineup coverage, steals, and major reaches.</p>
      <div className="draftReportStats"><span><b>{report.coverage}%</b> starter coverage</span><span><b>{report.steals}</b> value picks</span><span><b>{report.reaches}</b> major reaches</span><span><b>{best?.player.name || "—"}</b> best value</span></div></div>
    <button type="button" onClick={shareRecap}>Share recap</button>
  </section>;
}
