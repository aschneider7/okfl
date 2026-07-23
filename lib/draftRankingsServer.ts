import "server-only";
import {fallbackPprPool} from "./draftSimulator";
import {buildSleeperDraftPool,fallbackRankingsMeta} from "./draftRankings";
import type {DraftRankingsResponse} from "./draftRankings";

const RANKINGS_URL="https://api.sleeper.com/projections/nfl/2026?season_type=regular";

export async function getDraftRankingsResponse():Promise<DraftRankingsResponse>{
  const fallback=fallbackPprPool();
  try{
    const response=await fetch(RANKINGS_URL,{
      headers:{Accept:"application/json","User-Agent":"OKFL-OS/4.2"},
      next:{revalidate:43_200},
      signal:AbortSignal.timeout(4_000),
    });
    if(!response.ok)throw new Error(`Rankings request failed with ${response.status}.`);
    return buildSleeperDraftPool(await response.json(),fallback);
  }catch(error){
    const message=error instanceof Error?error.message:"Live rankings are temporarily unavailable.";
    return {players:fallback,meta:fallbackRankingsMeta(fallback,message)};
  }
}

