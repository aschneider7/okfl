import {useState} from "react";
import {useDraft} from "../context/DraftContext";
import {BestAvailable} from "./BestAvailable";
import {ManagerIntel} from "./ManagerIntel";
import {RecentPicks} from "./RecentPicks";
import {RosterPanel} from "./RosterPanel";
import {StrategyPanel} from "./StrategyPanel";

type SidebarTab = "recommendations" | "strategy" | "roster" | "recent" | "intel";

export function DraftSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>("recommendations");
  const {userOnClock, currentManager, complete, started, paused, recommendations, controlledRoster, recentPicks, queuedPlayers, watchedPlayers} = useDraft();
  const status = userOnClock ? "Make your selection from the player pool."
    : complete ? "The full mock is complete." : paused ? "Simulation paused. Resume when ready." : started ? "AI managers are advancing the board."
      : "Select a franchise and enter the draft.";
  const tabs: {id: SidebarTab; label: string; count?: number}[] = [
    {id: "recommendations", label: "Best", count: recommendations.length},
    {id: "strategy", label: "Queue", count: queuedPlayers.length + watchedPlayers.length},
    {id: "roster", label: "Roster", count: controlledRoster.length},
    {id: "recent", label: "Feed", count: recentPicks.length},
    {id: "intel", label: "Intel"},
  ];

  return <aside className="draftV2Sidebar">
    <article className={`draftV2OnClock ${userOnClock ? "isUserTurn" : ""}`}>
      <div><span className="statusDot" /><span className="eyebrow">{userOnClock ? "You are on the clock" : "Draft status"}</span></div>
      <h2>{currentManager?.manager || "Draft complete"}</h2><p>{status}</p>
    </article>
    <div className="draftSidebarTabs" role="tablist" aria-label="Draft information">
      {tabs.map((tab) => <button key={tab.id} role="tab" aria-selected={activeTab === tab.id}
        className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>
        {tab.label}{tab.count !== undefined && <span>{tab.count}</span>}
      </button>)}
    </div>
    <div className="draftSidebarPanel" role="tabpanel">
      {activeTab === "recommendations" && <BestAvailable />}
      {activeTab === "strategy" && <StrategyPanel />}
      {activeTab === "roster" && <RosterPanel />}
      {activeTab === "recent" && <RecentPicks />}
      {activeTab === "intel" && <ManagerIntel />}
    </div>
  </aside>;
}
