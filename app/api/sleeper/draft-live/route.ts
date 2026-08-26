import {NextResponse} from "next/server";
import {getSleeperDraftLive} from "@/lib/sleeperDraftLive";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
  try{return NextResponse.json(await getSleeperDraftLive(),{headers:{"Cache-Control":"no-store"}})}
  catch(error){return NextResponse.json({connected:false,error:error instanceof Error?error.message:String(error),checkedAt:new Date().toISOString()},{status:502,headers:{"Cache-Control":"no-store"}})}
}
