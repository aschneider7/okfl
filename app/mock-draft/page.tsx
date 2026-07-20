"use client";

import {Page} from "@/components/Page";
import {DraftLayout} from "./components/DraftLayout";
import {DraftProvider} from "./context/DraftContext";
import "./styles/draft-room.css";

export default function MockDraftPage() {
  return <Page title="2026 OKFL Draft Room"
    subtitle="Choose a simulation style, build a queue, save your mock, and receive an explainable final draft grade.">
    <DraftProvider><DraftLayout /></DraftProvider>
  </Page>;
}
