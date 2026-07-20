import { NextResponse } from "next/server";
import { isCommissioner } from "@/lib/commissionerAuth";
import { syncSleeper } from "@/lib/sleeperSync";

export const runtime = "nodejs";
export const maxDuration = 60;

async function allowed(request:Request) {
  const cron = process.env.CRON_SECRET;
  if (cron && request.headers.get("authorization") === `Bearer ${cron}`) return true;
  return isCommissioner();
}

async function run(request:Request) {
  if (!(await allowed(request))) {
    return NextResponse.json({error:"Unauthorized"},{status:401});
  }

  try {
    const {snapshot,counts,run_id,power_rankings} = await syncSleeper();
    return NextResponse.json({
      ok:true,
      run_id,
      synced_at:snapshot.synced_at,
      counts,
      integrity:snapshot.integrity,
      power_rankings:{phase:power_rankings.phase,week:power_rankings.week,leader:power_rankings.rankings[0]?.franchise}
    });
  } catch (error) {
    return NextResponse.json({
      error:error instanceof Error ? error.message : String(error)
    },{status:500});
  }
}

export async function GET(request:Request){return run(request)}
export async function POST(request:Request){return run(request)}
