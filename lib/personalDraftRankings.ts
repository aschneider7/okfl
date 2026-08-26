import type {DraftPlayer} from "./draftSimulator.ts";
import {draftPlayerKey} from "./draftRankings.ts";

export const PERSONAL_RANKINGS_SEASON=2026;

export function normalizeRankingKeys(keys:unknown,players:DraftPlayer[]){
  const playerKeys=players.map((player)=>draftPlayerKey(player.name));
  const valid=new Set(playerKeys);
  const seen=new Set<string>();
  const ordered:string[]=[];
  if(Array.isArray(keys))for(const value of keys){
    const key=String(value||"");
    if(valid.has(key)&&!seen.has(key)){seen.add(key);ordered.push(key)}
  }
  for(const key of playerKeys)if(!seen.has(key))ordered.push(key);
  return ordered;
}

export function orderPlayersByKeys(players:DraftPlayer[],keys:unknown){
  const normalized=normalizeRankingKeys(keys,players);
  const byKey=new Map(players.map((player)=>[draftPlayerKey(player.name),player]));
  return normalized.map((key,index)=>({...byKey.get(key)!,pprRank:index+1}));
}
