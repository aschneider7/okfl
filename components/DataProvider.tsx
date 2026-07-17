"use client";
import {createContext,useContext,useEffect,useState} from "react";
import type {OKFLData} from "@/lib/types";
import {getData} from "@/lib/data";
const C=createContext<{data:OKFLData|null,error:string|null}>({data:null,error:null});
export function DataProvider({children}:{children:React.ReactNode}){
 const [data,setData]=useState<OKFLData|null>(null);const [error,setError]=useState<string|null>(null);
 useEffect(()=>{Promise.all([getData(),fetch("/api/sleeper/live").then(r=>r.ok?r.json():null).catch(()=>null)]).then(([archive,live])=>setData({...archive,live_2026:live?.available===false?null:live})).catch(e=>setError(String(e)))},[]);
 return <C.Provider value={{data,error}}>{children}</C.Provider>
}
export const useData=()=>useContext(C);
