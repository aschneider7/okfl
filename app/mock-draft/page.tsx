"use client";

import {Page} from "@/components/Page";
import {DraftLayout} from "./components/DraftLayout";
import {DraftProvider} from "./context/DraftContext";
import "./styles/draft-room.css";

export default function MockDraftPage() {
  return <Page title="2026 OKFL Draft Room"
    subtitle="Full-PPR rankings, a modest quarterback bump, locked projected keepers, and AI managers with distinct OKFL identities.">
    <DraftProvider><DraftLayout /></DraftProvider>
  </Page>;
}
