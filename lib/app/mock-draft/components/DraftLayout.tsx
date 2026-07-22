import {DraftBoard} from "./DraftBoard";
import {DraftHeader} from "./DraftHeader";
import {DraftSidebar} from "./DraftSidebar";
import {DraftWorkspace} from "./DraftWorkspace";
import {StatusBar} from "./StatusBar";
import {DraftReport} from "./DraftReport";

export function DraftLayout() {
  return <div className="draftRoomV3"><DraftHeader />
    <DraftBoard /><DraftReport />
    <div className="draftV2Workbench"><DraftWorkspace /><DraftSidebar /></div>
    <StatusBar />
  </div>;
}
