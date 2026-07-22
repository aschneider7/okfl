import archive from "@/public/data/okfl.json";
import type {OKFLData} from "./types";
import {createAdminSupabase} from "./supabaseServer";
import {buildLivePowerSnapshot,type LivePowerSnapshot} from "./livePowerRankings";
const OKFL_LEAGUE_ID="okfl";
const SYNC_SEASON=2026;

export async function readLatestLivePowerSnapshot():Promise<LivePowerSnapshot|null>{
  const supabase=createAdminSupabase();
  const {data,error}=await supabase.from("power_ranking_snapshots").select("snapshot").eq("league_id",OKFL_LEAGUE_ID).eq("season",SYNC_SEASON).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(error)throw error;
  return (data?.snapshot as LivePowerSnapshot|undefined)??null;
}

export async function saveLivePowerSnapshot(sleeper:any,runId:string){
  const supabase=createAdminSupabase();
  const previous=await readLatestLivePowerSnapshot();
  const snapshot=buildLivePowerSnapshot(archive as unknown as OKFLData,sleeper,previous);
  const {error}=await supabase.from("power_ranking_snapshots").upsert({
    league_id:OKFL_LEAGUE_ID,season:SYNC_SEASON,week:snapshot.week,phase:snapshot.phase,
    source_sync_run:runId,model_version:snapshot.modelVersion,synced_at:snapshot.syncedAt,snapshot
  },{onConflict:"league_id,season,week,phase"});
  if(error)throw error;
  return snapshot;
}
