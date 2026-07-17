import {useDraft} from "../context/DraftContext";
import {BestAvailable} from "./BestAvailable";
import {RecentPicks} from "./RecentPicks";

export function DraftSidebar() {
  const {userOnClock, currentManager, complete, started} = useDraft();
  const status = userOnClock ? "Pick a player below. The simulator will immediately make every AI selection until your next turn."
    : complete ? "The full mock is complete." : started ? "The simulator is advancing to your next pick."
      : "Press Start Mock to auto-draft every pick before your first selection.";
  return <aside className="draftV2Sidebar"><article className="draftV2OnClock">
    <span className="eyebrow">{userOnClock ? "You are on the clock" : "Draft status"}</span>
    <h2>{currentManager?.manager || "Draft complete"}</h2><p>{status}</p>
  </article><BestAvailable /><RecentPicks /></aside>;
}
