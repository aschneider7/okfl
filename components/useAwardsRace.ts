"use client";
import {useEffect,useState} from "react";
import type {AwardsRace} from "@/lib/leagueAwards";

export function useAwardsRace(){
  const [state,setState]=useState<{loading:boolean;awards:AwardsRace|null}>({loading:true,awards:null});
  useEffect(()=>{
    let active=true;
    let refreshing=false;
    const refresh=async()=>{
      if(refreshing)return;
      refreshing=true;
      try{
        const result=await fetch("/api/league-awards",{cache:"no-store"}).then((response)=>response.json());
        if(active)setState({loading:false,awards:result.awards??null});
      }catch{
        if(active)setState((current)=>({...current,loading:false}));
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
  },[]);
  return state;
}
