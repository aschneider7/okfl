import { NextResponse } from "next/server";
import { readSleeperSnapshot } from "@/lib/sleeperSync";
export const revalidate=60;
export async function GET(){const snapshot=await readSleeperSnapshot();return NextResponse.json(snapshot??{available:false},{headers:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=300"}});}
