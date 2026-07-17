import { NextResponse } from "next/server";
import { isCommissioner } from "@/lib/commissionerAuth";
import { getSyncHistory, readSleeperSnapshot } from "@/lib/sleeperSync";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isCommissioner())) {
    return NextResponse.json({error:"Unauthorized"},{status:401});
  }

  try {
    const [snapshot,history] = await Promise.all([
      readSleeperSnapshot(),
      getSyncHistory(10)
    ]);

    return NextResponse.json({
      configured:Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY),
      storage:"supabase",
      snapshot,
      history
    });
  } catch (error) {
    return NextResponse.json({
      configured:Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY),
      storage:"supabase",
      snapshot:null,
      history:[],
      error:error instanceof Error ? error.message : String(error)
    },{status:500});
  }
}
