import {managers} from "@/lib/draftSimulator";
import {useDraft} from "../context/DraftContext";

export function DraftControls() {
  const {controlledFranchise, setControlledFranchise, started, startMock, undoUserTurn, reset} = useDraft();
  return <div className="draftV2TeamSelect" aria-label="Draft controls">
    <label><span>Your franchise</span><select aria-label="Team to control" value={controlledFranchise} disabled={started}
      onChange={(event) => setControlledFranchise(event.target.value)}>
      {managers.map((manager) => <option key={manager.franchiseId} value={manager.franchiseId}>
        {manager.slot}. {manager.manager}
      </option>)}
    </select></label>
    {!started ? <button className="startMockButton" onClick={startMock}>Enter Draft</button> : <>
      <button onClick={undoUserTurn}>Undo Pick</button><button onClick={reset}>New Mock</button>
    </>}
  </div>;
}
