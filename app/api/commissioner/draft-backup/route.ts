import {NextResponse} from "next/server";
import {getAccountFromRequest} from "@/lib/accountServer";
import {draftPicksCsv,getSleeperDraftLive} from "@/lib/sleeperDraftLive";
import {readSleeperSnapshot} from "@/lib/sleeperSync";

export const runtime="nodejs";

export async function GET(request:Request){
  const account=await getAccountFromRequest(request);
  if(account?.role!=="commissioner"||account.mustChangePassword)return NextResponse.json({error:"Commissioner access required."},{status:403});
  try{
    const url=new URL(request.url);const format=url.searchParams.get("format")==="csv"?"csv":"json";
    const [live,snapshot]=await Promise.all([getSleeperDraftLive(),readSleeperSnapshot()]);
    const stamp=new Date().toISOString().replaceAll(":","-").slice(0,19);
    if(format==="csv")return new NextResponse(draftPicksCsv(live.picks),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="okfl-draft-${stamp}.csv"`,"Cache-Control":"no-store"}});
    return NextResponse.json({exportedAt:new Date().toISOString(),live,snapshot},{headers:{"Content-Disposition":`attachment; filename="okfl-draft-${stamp}.json"`,"Cache-Control":"no-store"}});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:500})}
}
