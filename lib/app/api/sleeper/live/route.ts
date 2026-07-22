import { NextResponse } from "next/server";
import { readSleeperSnapshot } from "@/lib/sleeperSync";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  try {
    const snapshot = await readSleeperSnapshot();
    return NextResponse.json(snapshot ?? {available:false},{
      headers:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=300"}
    });
  } catch (error) {
    return NextResponse.json({
      available:false,
      error:error instanceof Error ? error.message : String(error)
    },{status:503});
  }
}
