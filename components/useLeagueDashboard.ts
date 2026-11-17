"use client";

import {useEffect,useMemo,useState} from "react";
import type {OKFLData} from "@/lib/types";
import {buildPowerRankings,type PowerRanking} from "@/lib/powerRankings";
import {buildLeagueDashboard,type LeagueDashboard} from "@/lib/liveLeague";

export function useLeagueDashboard(data:OKFLData|null){
  const fallback=useMemo(()=>data?buildPowerRankings(data):[],[data]);
  const [state,setState]=useState<{loading:boolean;snapshot:any;power:PowerRanking[]}>({loading:true,snapshot:null,power:[]});
  useEffect(()=>{
    let active=true;
    let refreshing=false;
    const refresh=async()=>{
      if(refreshing)return;
      refreshing=true;
      try{
        const [snapshot,powerResult]=await Promise.all([
          fetch("/api/sleeper/live",{cache:"no-store"}).then((response)=>response.json()),
          fetch("/api/power-rankings/live",{cache:"no-store"}).then((response)=>response.json())
        ]);
        if(active)setState({loading:false,snapshot,power:powerResult.snapshot?.rankings??fallback});
      }catch{
        if(active)setState((current)=>({loading:false,snapshot:current.snapshot,power:current.power.length?current.power:fallback}));
      }finally{
        refreshing=false;
      }
    };
    const onVisible=()=>{if(document.visibilityState==="visible")void refresh()};
    void refresh();
    const timer=window.setInterval(()=>void refresh(),5*60*1000);
    window.addEventListener("focus",refresh);
    document.addEventListener("visibilitychange",onVisible);
    return()=>{
      active=false;
      window.clearInterval(timer);
      window.removeEventListener("focus",refresh);
      document.removeEventListener("visibilitychange",onVisible);
    };
  },[fallback]);
  const dashboard:LeagueDashboard=useMemo(()=>buildLeagueDashboard(state.snapshot,state.power.length?state.power:fallback,data?.franchises??[]),[state.snapshot,state.power,fallback,data]);
  return {dashboard,loading:state.loading,power:state.power.length?state.power:fallback,snapshot:state.snapshot};
}
