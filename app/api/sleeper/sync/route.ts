import { NextResponse } from "next/server";
import { isCommissioner } from "@/lib/commissionerAuth";
import { syncSleeper } from "@/lib/sleeperSync";
export const maxDuration = 60;
async function allowed(request:Request){
  const cron=process.env.CRON_SECRET;
  if(cron && request.headers.get("authorization")===`Bearer ${cron}`) return true;
  return isCommissioner();
}
async function run(request:Request){
  if(!(await allowed(request))) return NextResponse.json({error:"Unauthorized"},{status:401});
  try{const {snapshot,blob}=await syncSleeper();return NextResponse.json({ok:true,synced_at:snapshot.synced_at,counts:{users:snapshot.users.length,rosters:snapshot.rosters.length,transactions:snapshot.transactions.length,trades:snapshot.trades.length,matchups:snapshot.matchups.length},integrity:snapshot.integrity,blob_url:blob.url});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:500});}
}
export async function GET(request:Request){return run(request)}
export async function POST(request:Request){return run(request)}
