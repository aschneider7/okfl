"use client";

import {Page} from "@/components/Page";
import {DraftLayout} from "./components/DraftLayout";
import {DraftProvider} from "./context/DraftContext";
import "./styles/draft-room.css";

export default function MockDraftPage() {
  return <Page title="2026 OKFL Draft Room"
    subtitle="Draft from Sleeper's current full-PPR market, adjusted by how OKFL actually drafted quarterbacks against that market in 2023-2025.">
    <DraftProvider><DraftLayout /></DraftProvider>
  </Page>;
}
