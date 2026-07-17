import {managers} from "@/lib/draftSimulator";
import {useDraft} from "../context/DraftContext";

export function DraftControls() {
  const {controlledFranchise, setControlledFranchise, started, startMock, undoUserTurn, reset} = useDraft();
  return <div className="draftV2TeamSelect">
    <label><span>Control team</span><select value={controlledFranchise} disabled={started}
      onChange={(event) => setControlledFranchise(event.target.value)}>
      {managers.map((manager) => <option key={manager.franchiseId} value={manager.franchiseId}>
        Pick {manager.slot} • {manager.manager}
      </option>)}
    </select></label>
    {!started ? <button className="startMockButton" onClick={startMock}>Start Mock</button> : <>
      <button onClick={undoUserTurn}>Undo My Last Pick</button><button onClick={reset}>New Mock</button>
    </>}
  </div>;
}
