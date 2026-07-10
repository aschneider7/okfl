import type { OKFLData } from "./types";
let cache:OKFLData|null=null;
export async function getData():Promise<OKFLData>{if(cache)return cache;const res=await fetch("/data/okfl.json");if(!res.ok)throw new Error("Unable to load OKFL data");cache=await res.json() as OKFLData;return cache}
export function sortBySeason<T extends {season?:number;week?:number}>(rows:T[],desc=false){return [...rows].sort((a,b)=>{const d=(a.season??0)-(b.season??0)||((a.week??0)-(b.week??0));return desc?-d:d})}
export const fmt=(n:number|undefined,d=1)=>Number(n??0).toFixed(d);
