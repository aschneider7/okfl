"use client";

import {createContext, useContext, type ReactNode} from "react";
import {useDraftEngine, type DraftEngine} from "../hooks/useDraftEngine";

const DraftContext = createContext<DraftEngine | null>(null);

export function DraftProvider({children}: {children: ReactNode}) {
  return <DraftContext.Provider value={useDraftEngine()}>{children}</DraftContext.Provider>;
}

export function useDraft() {
  const context = useContext(DraftContext);
  if (!context) throw new Error("useDraft must be used inside DraftProvider");
  return context;
}
