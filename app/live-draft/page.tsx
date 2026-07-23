import {Page} from "@/components/Page";
import {LiveDraftClient} from "./LiveDraftClient";
import "../mock-draft/styles/draft-room.css";
import "./live-draft.css";

export default async function LiveDraftPage({searchParams}: {searchParams: Promise<{room?: string}>}) {
  const {room} = await searchParams;
  return <Page title="OKFL Live Draft Room"
    subtitle="Start with the projected Mock Draft keepers or the locked official board, then let every signed-in manager claim the correct franchise automatically.">
    <LiveDraftClient initialCode={String(room || "").toUpperCase()} />
  </Page>;
}
