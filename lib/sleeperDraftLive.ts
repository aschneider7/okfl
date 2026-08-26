import "server-only";
import {SLEEPER_LEAGUE_ID,SYNC_SEASON,readSleeperSnapshot} from "@/lib/sleeperSync";

const API="https://api.sleeper.app/v1";

async function sleeper<T>(path:string):Promise<T>{
  const response=await fetch(`${API}${path}`,{cache:"no-store",headers:{Accept:"application/json","User-Agent":"OKFL-OS/10.0"},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error(`Sleeper ${path} returned ${response.status}.`);
  return response.json() as Promise<T>;
}

export async function getSleeperDraftLive(){
  const [drafts,snapshot]=await Promise.all([
    sleeper<any[]>(`/league/${SLEEPER_LEAGUE_ID}/drafts`),
    readSleeperSnapshot().catch(()=>null),
  ]);
  const draft=[...drafts].sort((a,b)=>Number(b.start_time||0)-Number(a.start_time||0)).find((row)=>String(row.season||SYNC_SEASON)===String(SYNC_SEASON))||drafts[0]||null;
  if(!draft)return {connected:true,draft:null,picks:[],expectedPicks:0,storedPicks:Number(snapshot?.integrity?.draft_pick_count||0),mismatch:false,checkedAt:new Date().toISOString()};
  const picks=await sleeper<any[]>(`/draft/${draft.draft_id}/picks`).catch(()=>[]);
  const rosterMap=new Map((snapshot?.rosters||[]).map((roster:any)=>[String(roster.roster_id),{franchiseId:roster.franchise_id||null,franchise:roster.franchise||null}]));
  const userMap=new Map((snapshot?.users||[]).map((user:any)=>[String(user.user_id),{franchiseId:user.franchise_id||null,franchise:user.franchise||null}]));
  const mapped=picks.map((pick:any)=>{
    const owner=rosterMap.get(String(pick.roster_id))||userMap.get(String(pick.picked_by))||{franchiseId:null,franchise:null};
    const metadata=pick.metadata||{};
    return {...pick,franchise_id:owner.franchiseId,franchise:owner.franchise,player:metadata.full_name||[metadata.first_name,metadata.last_name].filter(Boolean).join(" ")||metadata.player_name||String(pick.player_id||"Unknown player"),position:metadata.position||"",team:metadata.team||""};
  });
  const expectedPicks=Number(draft.settings?.teams||10)*Number(draft.settings?.rounds||17);
  const storedPicks=Number(snapshot?.integrity?.draft_pick_count||0);
  return {
    connected:true,
    draft:{draftId:draft.draft_id,status:draft.status||"unknown",startTime:draft.start_time?new Date(Number(draft.start_time)).toISOString():null,teams:Number(draft.settings?.teams||10),rounds:Number(draft.settings?.rounds||17)},
    picks:mapped,expectedPicks,storedPicks,mappedPicks:mapped.filter((pick:any)=>pick.franchise_id).length,
    mismatch:picks.length!==storedPicks,complete:draft.status==="complete"&&picks.length===expectedPicks,
    checkedAt:new Date().toISOString(),storedAt:snapshot?.synced_at||null,
  };
}

export function draftPicksCsv(picks:any[]){
  const columns=["pick_no","round","draft_slot","franchise_id","franchise","player","position","team","player_id","is_keeper"];
  const cell=(value:unknown)=>`"${String(value??"").replaceAll('"','""')}"`;
  return [columns.join(","),...picks.map((pick)=>columns.map((column)=>cell(pick[column])).join(","))].join("\r\n");
}
