import {NextResponse} from "next/server";
import archive from "@/public/data/okfl.json";
import type {OKFLData} from "@/lib/types";
import {readSleeperSnapshot} from "@/lib/sleeperSync";
import {readLatestLivePowerSnapshot} from "@/lib/livePowerStore";
import {buildPowerRankings} from "@/lib/powerRankings";
import {buildLeagueDashboard} from "@/lib/liveLeague";
import {buildAwardsRace} from "@/lib/leagueAwards";

export const runtime="nodejs";
export const maxDuration=60;
export const revalidate=60;

export async function GET(){
  try{
    const data=archive as unknown as OKFLData;
    const [snapshot,powerSnapshot,directoryResponse]=await Promise.all([
      readSleeperSnapshot(),
      readLatestLivePowerSnapshot().catch(()=>null),
      fetch("https://api.sleeper.app/v1/players/nfl",{next:{revalidate:60*60*24}})
    ]);
    if(!snapshot)return NextResponse.json({available:false});
    if(!directoryResponse.ok)throw new Error(`Sleeper player directory returned ${directoryResponse.status}`);
    const directory=await directoryResponse.json();
    const power=powerSnapshot?.rankings??buildPowerRankings(data);
    const dashboard=buildLeagueDashboard(snapshot,power,data.franchises);
    const awards=buildAwardsRace(snapshot,directory,power,dashboard);
    return NextResponse.json({available:true,awards},{headers:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=300"}});
  }catch(error){return NextResponse.json({available:false,error:error instanceof Error?error.message:String(error)},{status:503});}
}
