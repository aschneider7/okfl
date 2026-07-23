import {Page} from "@/components/Page";
import {LiveDraftClient} from "./LiveDraftClient";
import "../mock-draft/styles/draft-room.css";
import "./live-draft.css";

export default async function LiveDraftPage({searchParams}: {searchParams: Promise<{room?: string}>}) {
  const {room} = await searchParams;
  return <Page title="OKFL Live Draft Room"
    subtitle="Draft together with the same franchise AI as the local mock, persistent missed-pick autodraft, and Commissioner controls for every selection.">
    <LiveDraftClient initialCode={String(room || "").toUpperCase()} />
  </Page>;
}
