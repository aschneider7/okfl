import {Page} from "@/components/Page";
import {LiveDraftClient} from "./LiveDraftClient";
import "../mock-draft/styles/draft-room.css";
import "./live-draft.css";

export default async function LiveDraftPage({searchParams}: {searchParams: Promise<{room?: string}>}) {
  const {room} = await searchParams;
  return <Page title="OKFL Live Draft Room"
    subtitle="Create a room, share team PINs, and draft together live from up to ten devices.">
    <LiveDraftClient initialCode={String(room || "").toUpperCase()} />
  </Page>;
}

