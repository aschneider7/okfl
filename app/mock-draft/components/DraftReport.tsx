import {useDraft} from "../context/DraftContext";
import {gradeTone} from "../types";

export function DraftReport() {
  const {complete, report, controlledManager, controlledRoster, shareRecap} = useDraft();
  if (!complete) return null;
  const best = controlledRoster.filter((pick) => !pick.keeper).sort((a, b) => ({"A+": 6, A: 5, "B+": 4, B: 3, C: 2, D: 1}[b.grade || "C"] || 0) - ({"A+": 6, A: 5, "B+": 4, B: 3, C: 2, D: 1}[a.grade || "C"] || 0))[0];
  return <section className="draftReport"><div className={`draftReportGrade ${gradeTone(report.grade)}`}><span>Final grade</span><b>{report.grade}</b><strong>{report.score}/100</strong></div>
    <div><span className="eyebrow">Post-draft report</span><h2>{controlledManager.manager} built a {report.grade} roster</h2><p>The grade weighs market value, starter quality, roster construction, and actual keeper surplus.</p>
      <div className="draftReportStats draftReportBreakdown"><span><b>{report.valueScore}</b> draft value</span><span><b>{report.lineupScore}</b> starting lineup</span><span><b>{report.constructionScore}</b> construction</span><span><b>{report.keeperScore}</b> keeper value</span></div>
      <div className="draftReportStats"><span><b>{report.coverage}%</b> starter slots filled</span><span><b>{report.steals}</b> value picks</span><span><b>{report.reaches}</b> major reaches</span><span><b>{best?.player.name || "—"}</b> best value</span></div></div>
    <button type="button" onClick={shareRecap}>Share recap</button>
  </section>;
}
