import {Fragment} from "react";
import {DRAFT_ROUNDS, managers} from "@/lib/draftSimulator";
import {useDraft} from "../context/DraftContext";
import {pickKey} from "../types";
import {BoardCell} from "./BoardCell";

export function DraftBoard() {
  const {board, complete, current, controlledFranchise, userOnClock, paused} = useDraft();
  return <section className="draftV2BoardPanel">
    <header><div><span className="eyebrow">10-team PPR · 17 rounds · Snake</span><h2>Draft board</h2><span className="boardSwipeHint">Swipe to explore every team →</span></div>
      <div className={`clockStatus ${userOnClock ? "yourTurn" : ""}`}>
        <span>{complete ? "Complete" : paused ? "Paused" : userOnClock ? "Your pick" : "On the clock"}</span><b>{current ? `${current.round}.${current.slot}` : "—"}</b>
      </div></header>
    <div className="draftV2BoardScroller">
      <div className="draftV2ManagerRow"><div className="draftRoundCorner">RD</div>{managers.map((manager) => <div
        className={manager.franchiseId === controlledFranchise ? "controlled" : ""} key={manager.franchiseId}>
        <i>{manager.manager.slice(0, 1)}</i><span>Pick {manager.slot}</span><b>{manager.manager}</b><small>{manager.archetype}</small></div>)}</div>
      <div className="draftV2Board">{Array.from({length: DRAFT_ROUNDS}, (_, roundIndex) => {
        const round = roundIndex + 1;
        return <Fragment key={round}><div className="draftRoundLabel"><span>R</span><b>{round}</b></div>
          {Array.from({length: 10}, (_, slotIndex) => {
            const slot = slotIndex + 1; const manager = managers.find((row) => row.slot === slot)!;
            return <BoardCell key={`${round}-${slot}`} round={round} slot={slot} pick={board.get(pickKey(round, slot))}
              active={current?.round === round && current?.slot === slot} manager={manager} controlledFranchise={controlledFranchise} />;
          })}</Fragment>;
      })}</div>
    </div>
  </section>;
}
