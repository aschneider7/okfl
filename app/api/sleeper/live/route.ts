import { NextResponse } from "next/server";
import { readSleeperSnapshot } from "@/lib/sleeperSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await readSleeperSnapshot();
    return NextResponse.json(snapshot ?? {available:false},{headers:{"Cache-Control":"no-store"}});
  } catch (error) {
    return NextResponse.json({
      available:false,
      error:error instanceof Error ? error.message : String(error)
    },{status:503});
  }
}
