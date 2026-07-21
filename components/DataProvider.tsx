"use client";

import {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import type {OKFLData} from "@/lib/types";
import {getData} from "@/lib/data";

type DataContextValue={data:OKFLData|null;error:string|null;loading:boolean;loadData:()=>Promise<OKFLData|null>};
const DataContext = createContext<DataContextValue|null>(null);

export function DataProvider({children}: {children: React.ReactNode}) {
  const [data, setData] = useState<OKFLData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading,setLoading]=useState(false);

  const loadData=useCallback(async()=>{
    if(data)return data;
    setLoading(true);setError(null);
    try{const archive=await getData();setData(archive);return archive}
    catch(reason){setError(reason instanceof Error?reason.message:String(reason));return null}
    finally{setLoading(false)}
  },[data]);

  const value=useMemo(()=>({data,error,loading,loadData}),[data,error,loading,loadData]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(options:{lazy?:boolean}={}){
  const value=useContext(DataContext);if(!value)throw new Error("useData must be used inside DataProvider");
  const {lazy=false}=options;
  useEffect(()=>{if(!lazy)void value.loadData()},[lazy,value.loadData]);
  return value;
}
