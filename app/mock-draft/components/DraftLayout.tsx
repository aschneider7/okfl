import {DraftBoard} from "./DraftBoard";
import {DraftHeader} from "./DraftHeader";
import {DraftSidebar} from "./DraftSidebar";
import {DraftWorkspace} from "./DraftWorkspace";
import {StatusBar} from "./StatusBar";

export function DraftLayout() {
  return <div className="draftRoomV3"><DraftHeader />
    <div className="draftV2Layout"><DraftBoard /><DraftSidebar /></div>
    <DraftWorkspace /><StatusBar />
  </div>;
}
