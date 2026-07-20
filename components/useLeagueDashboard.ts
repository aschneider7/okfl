"use client";

import {useEffect,useMemo,useState} from "react";
import type {OKFLData} from "@/lib/types";
import {buildPowerRankings,type PowerRanking} from "@/lib/powerRankings";
import {buildLeagueDashboard,type LeagueDashboard} from "@/lib/liveLeague";

export function useLeagueDashboard(data:OKFLData|null){
  const fallback=useMemo(()=>data?buildPowerRankings(data):[],[data]);
  const [state,setState]=useState<{loading:boolean;snapshot:any;power:PowerRanking[]}>({loading:true,snapshot:null,power:[]});
  useEffect(()=>{let active=true;Promise.all([fetch("/api/sleeper/live").then((response)=>response.json()),fetch("/api/power-rankings/live").then((response)=>response.json())]).then(([snapshot,powerResult])=>{if(active)setState({loading:false,snapshot,power:powerResult.snapshot?.rankings??fallback});}).catch(()=>{if(active)setState({loading:false,snapshot:null,power:fallback});});return()=>{active=false};},[fallback]);
  const dashboard:LeagueDashboard=useMemo(()=>buildLeagueDashboard(state.snapshot,state.power.length?state.power:fallback,data?.franchises??[]),[state.snapshot,state.power,fallback,data]);
  return {dashboard,loading:state.loading,power:state.power.length?state.power:fallback};
}
