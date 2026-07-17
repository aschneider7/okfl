import {DRAFT_ROUNDS, managers} from "@/lib/draftSimulator";
import {useDraft} from "../context/DraftContext";
import {pickKey} from "../types";
import {BoardCell} from "./BoardCell";

export function DraftBoard() {
  const {board, complete, current, controlledFranchise, userOnClock} = useDraft();
  return <section className="draftV2BoardPanel">
    <header><div><span className="eyebrow">Official 2026 order</span><h2>Live draft board</h2></div>
      <div className={`clockStatus ${userOnClock ? "yourTurn" : ""}`}>
        <span>{complete ? "Complete" : userOnClock ? "Your pick" : "AI drafting"}</span><b>{current ? `${current.round}.${current.slot}` : "—"}</b>
      </div></header>
    <div className="draftV2BoardScroller">
      <div className="draftV2ManagerRow">{managers.map((manager) => <div
        className={manager.franchiseId === controlledFranchise ? "controlled" : ""} key={manager.franchiseId}>
        <span>{manager.slot}</span><b>{manager.manager}</b><small>{manager.archetype}</small></div>)}</div>
      <div className="draftV2Board">{Array.from({length: DRAFT_ROUNDS}, (_, roundIndex) => {
        const round = roundIndex + 1;
        return Array.from({length: 10}, (_, slotIndex) => {
          const slot = slotIndex + 1; const manager = managers.find((row) => row.slot === slot)!;
          return <BoardCell key={`${round}-${slot}`} round={round} slot={slot} pick={board.get(pickKey(round, slot))}
            active={current?.round === round && current?.slot === slot} manager={manager} controlledFranchise={controlledFranchise} />;
        });
      })}</div>
    </div>
  </section>;
}
