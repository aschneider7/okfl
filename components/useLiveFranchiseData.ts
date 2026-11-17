"use client";

import {useMemo} from "react";
import {useData} from "@/components/DataProvider";
import {useLeagueDashboard} from "@/components/useLeagueDashboard";
import {mergeLiveFranchiseData} from "@/lib/liveFranchiseData";

export function useLiveFranchiseData(){
  const archive=useData();
  const league=useLeagueDashboard(archive.data);
  const data=useMemo(()=>archive.data?mergeLiveFranchiseData(archive.data,league.dashboard,league.snapshot):null,[archive.data,league.dashboard,league.snapshot]);
  return {...archive,data,...league};
}
