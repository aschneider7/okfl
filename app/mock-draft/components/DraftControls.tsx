import {managers} from "@/lib/draftSimulator";
import {useDraft} from "../context/DraftContext";

export function DraftControls() {
  const {controlledFranchise, setControlledFranchise, started, complete, isSimulating, paused,
    simulationSpeed, setSimulationSpeed, draftMode, setDraftMode, hasSavedDraft, startMock, resumeMock,
    undoUserTurn, reset, togglePause} = useDraft();
  return <div className="draftV2TeamSelect" aria-label="Draft controls">
    <label><span>Your franchise</span><select aria-label="Team to control" value={controlledFranchise} disabled={started}
      onChange={(event) => setControlledFranchise(event.target.value)}>
      {managers.map((manager) => <option key={manager.franchiseId} value={manager.franchiseId}>
        {manager.slot}. {manager.manager}
      </option>)}
    </select></label>
    {!started ? <>
      <label><span>Draft mode</span><select aria-label="Draft simulation mode" value={draftMode} onChange={(event) => setDraftMode(event.target.value as typeof draftMode)}>
        <option value="realistic">Realistic</option><option value="balanced">Balanced</option><option value="chaos">Chaos</option>
      </select></label>
      {hasSavedDraft && <button onClick={resumeMock}>Resume</button>}
      <button className="startMockButton" onClick={startMock}>Enter Draft</button>
    </> : <>
      <div className="speedControl" aria-label="Simulation speed">
        <button className={simulationSpeed === "normal" ? "active" : ""} onClick={() => setSimulationSpeed("normal")}>Normal</button>
        <button className={simulationSpeed === "turbo" ? "active" : ""} onClick={() => setSimulationSpeed("turbo")}>Turbo</button>
      </div>
      {(isSimulating || paused) && !complete && <button onClick={togglePause}>{paused ? "Resume" : "Pause"}</button>}
      <button onClick={undoUserTurn}>Undo Pick</button><button onClick={reset}>New Mock</button>
    </>}
  </div>;
}
