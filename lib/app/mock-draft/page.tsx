"use client";

import {Page} from "@/components/Page";
import {DraftLayout} from "./components/DraftLayout";
import {DraftProvider} from "./context/DraftContext";
import "./styles/draft-room.css";

export default function MockDraftPage() {
  return <Page title="2026 OKFL Draft Room"
    subtitle="Draft against a live 10-team PPR market board with kickers, defenses, OKFL quarterback demand, and explainable final grades.">
    <DraftProvider><DraftLayout /></DraftProvider>
  </Page>;
}
