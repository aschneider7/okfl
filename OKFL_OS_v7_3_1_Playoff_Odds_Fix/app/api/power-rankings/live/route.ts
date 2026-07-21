import {NextResponse} from "next/server";
import {readLatestLivePowerSnapshot} from "@/lib/livePowerStore";

export const runtime="nodejs";
export const revalidate=60;

export async function GET(){
  try{
    const snapshot=await readLatestLivePowerSnapshot();
    return NextResponse.json({available:Boolean(snapshot),snapshot});
  }catch{
    // The public page remains usable with its archive model before migration 004 is installed.
    return NextResponse.json({available:false,snapshot:null});
  }
}
