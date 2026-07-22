import {NextResponse} from "next/server";
import archive from "@/public/data/okfl.json";
import type {OKFLData} from "@/lib/types";
import {readSleeperSnapshot} from "@/lib/sleeperSync";
import {readLatestLivePowerSnapshot} from "@/lib/livePowerStore";
import {buildPowerRankings} from "@/lib/powerRankings";
import {buildLeagueDashboard,simulatePlayoffOdds} from "@/lib/liveLeague";
import {buildTradeWarRoom} from "@/lib/tradeWarRoom";
import {fallbackPprPool} from "@/lib/draftSimulator";

export const runtime="nodejs";export const maxDuration=60;export const revalidate=300;
export async function GET(){try{const data=archive as unknown as OKFLData;const [snapshot,powerSnapshot,directoryResponse]=await Promise.all([readSleeperSnapshot(),readLatestLivePowerSnapshot().catch(()=>null),fetch("https://api.sleeper.app/v1/players/nfl",{next:{revalidate:86400}})]);if(!snapshot)return NextResponse.json({available:false});if(!directoryResponse.ok)throw new Error("Player directory unavailable.");const directory=await directoryResponse.json(),power=powerSnapshot?.rankings??buildPowerRankings(data),dashboard=buildLeagueDashboard(snapshot,power,data.franchises),odds=simulatePlayoffOdds(dashboard,2500),market=fallbackPprPool().map(player=>({name:player.name,position:player.position,pprRank:player.pprRank,keeperEligible:player.keeperEligible}));return NextResponse.json({available:true,warRoom:buildTradeWarRoom(data,snapshot,dashboard,power,odds,directory,market)},{headers:{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=900"}})}catch(error){return NextResponse.json({available:false,error:error instanceof Error?error.message:String(error)},{status:503})}}
