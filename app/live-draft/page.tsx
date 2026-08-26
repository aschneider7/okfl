import {Page} from "@/components/Page";
import {SleeperLiveDraftClient} from "@/components/SleeperLiveDraftClient";
import "../mock-draft/styles/draft-room.css";
import "./live-draft.css";

export default function LiveDraftPage() {
  return <Page title="Sleeper Live Draft Companion"
    subtitle="The official Sleeper board, private manager rankings, and OKFL sync status in one draft-night screen.">
    <SleeperLiveDraftClient />
  </Page>;
}
