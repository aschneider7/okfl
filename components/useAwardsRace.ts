"use client";
import {useEffect,useState} from "react";
import type {AwardsRace} from "@/lib/leagueAwards";

export function useAwardsRace(){
  const [state,setState]=useState<{loading:boolean;awards:AwardsRace|null}>({loading:true,awards:null});
  useEffect(()=>{let active=true;fetch("/api/league-awards").then((response)=>response.json()).then((result)=>{if(active)setState({loading:false,awards:result.awards??null})}).catch(()=>{if(active)setState({loading:false,awards:null})});return()=>{active=false};},[]);
  return state;
}
