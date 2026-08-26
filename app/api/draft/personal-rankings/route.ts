import {NextResponse} from "next/server";
import {getAccountFromRequest} from "@/lib/accountServer";
import {draftPlayerKey} from "@/lib/draftRankings";
import {getDraftRankingsResponse} from "@/lib/draftRankingsServer";
import {normalizeRankingKeys,orderPlayersByKeys,PERSONAL_RANKINGS_SEASON} from "@/lib/personalDraftRankings";
import {createAdminSupabase} from "@/lib/supabaseServer";

export const runtime="nodejs";

async function accountFor(request:Request){
  const account=await getAccountFromRequest(request);
  if(!account||account.mustChangePassword)return null;
  return account;
}

export async function GET(request:Request){
  const account=await accountFor(request);
  if(!account)return NextResponse.json({error:"Sign in and finish account setup to use private rankings."},{status:401});
  try{
    const [base,result]=await Promise.all([
      getDraftRankingsResponse(),
      createAdminSupabase().from("manager_draft_rankings").select("rankings,updated_at").eq("user_id",account.userId).eq("season",PERSONAL_RANKINGS_SEASON).maybeSingle(),
    ]);
    if(result.error)throw result.error;
    const keys=normalizeRankingKeys(result.data?.rankings,base.players);
    return NextResponse.json({
      players:orderPlayersByKeys(base.players,keys),keys,saved:Boolean(result.data),updatedAt:result.data?.updated_at||null,
      meta:{...base.meta,sourceLabel:result.data?`${account.displayName}'s private board`:base.meta.sourceLabel},
      account:{franchiseId:account.franchiseId,franchiseName:account.franchiseName,displayName:account.displayName},
    },{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:500})}
}

export async function POST(request:Request){
  const account=await accountFor(request);
  if(!account)return NextResponse.json({error:"Sign in and finish account setup to save rankings."},{status:401});
  try{
    const body=await request.json().catch(()=>({}));
    const supabase=createAdminSupabase();
    if(body.action==="reset"){
      const {error}=await supabase.from("manager_draft_rankings").delete().eq("user_id",account.userId).eq("season",PERSONAL_RANKINGS_SEASON);
      if(error)throw error;
      return NextResponse.json({ok:true,reset:true});
    }
    const base=await getDraftRankingsResponse();
    const requested=Array.isArray(body.rankings)?body.rankings:[];
    if(requested.length>600)return NextResponse.json({error:"The ranking board is too large."},{status:400});
    const keys=normalizeRankingKeys(requested,base.players);
    if(!keys.length)return NextResponse.json({error:"No valid players were submitted."},{status:400});
    const valid=new Set(base.players.map((player)=>draftPlayerKey(player.name)));
    if(requested.some((key:unknown)=>!valid.has(String(key))))return NextResponse.json({error:"The board contains an unknown player. Refresh and try again."},{status:409});
    const now=new Date().toISOString();
    const {error}=await supabase.from("manager_draft_rankings").upsert({user_id:account.userId,franchise_id:account.franchiseId,season:PERSONAL_RANKINGS_SEASON,rankings:keys,updated_at:now},{onConflict:"user_id,season"});
    if(error)throw error;
    return NextResponse.json({ok:true,keys,updatedAt:now});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:500})}
}
