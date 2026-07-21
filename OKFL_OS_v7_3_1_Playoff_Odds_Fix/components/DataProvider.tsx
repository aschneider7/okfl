"use client";

import {createContext, useContext, useEffect, useState} from "react";
import type {OKFLData} from "@/lib/types";
import {getData} from "@/lib/data";

const DataContext = createContext<{data: OKFLData | null; error: string | null}>({data: null, error: null});

export function DataProvider({children}: {children: React.ReactNode}) {
  const [data, setData] = useState<OKFLData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController(); let active = true;
    const liveRequest = fetch("/api/sleeper/live", {signal: controller.signal})
      .then((response) => response.ok ? response.json() : null).catch(() => null);
    Promise.all([getData(), liveRequest]).then(([archive, live]) => {
      if (active) setData({...archive, live_2026: live?.available === false ? null : live});
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : String(reason)); });
    return () => { active = false; controller.abort(); };
  }, []);

  return <DataContext.Provider value={{data, error}}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
