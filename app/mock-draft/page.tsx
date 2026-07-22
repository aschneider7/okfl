"use client";

import {Page} from "@/components/Page";
import {DraftLayout} from "./components/DraftLayout";
import {DraftProvider} from "./context/DraftContext";
import "./styles/draft-room.css";

export default function MockDraftPage() {
  return <Page title="2026 OKFL Draft Room"
    subtitle="Draft against a live PPR market, the 2023–2025 OKFL draft curve, current keeper demand, kickers, defenses, and explainable final grades.">
    <DraftProvider><DraftLayout /></DraftProvider>
  </Page>;
}
