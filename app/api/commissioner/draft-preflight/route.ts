import {NextResponse} from "next/server";
import {getAccountFromRequest} from "@/lib/accountServer";
import {getSleeperDraftLive} from "@/lib/sleeperDraftLive";
import {KEEPER_SEASON} from "@/lib/keeperSubmission";
import {readSleeperSnapshot} from "@/lib/sleeperSync";
import {createAdminSupabase} from "@/lib/supabaseServer";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:Request){
  const account=await getAccountFromRequest(request);
  if(account?.role!=="commissioner"||account.mustChangePassword)return NextResponse.json({error:"Commissioner access required."},{status:403});
  try{
    const supabase=createAdminSupabase();
    const [live,snapshot,accounts,windowResult,submissions,eligibility]=await Promise.all([
      getSleeperDraftLive(),readSleeperSnapshot(),
      supabase.from("franchise_accounts").select("franchise_id,display_name,username,role,must_change_password,franchises(name)").order("franchise_id"),
      supabase.from("keeper_windows").select("status,locked_at").eq("season",KEEPER_SEASON).maybeSingle(),
      supabase.from("keeper_submissions").select("franchise_id,status,choices").eq("season",KEEPER_SEASON),
      supabase.from("keeper_eligibility").select("eligible,roster_verified,cost_verified,pick_verified").eq("season",KEEPER_SEASON),
    ]);
    const error=accounts.error||windowResult.error||submissions.error||eligibility.error;if(error)throw error;
    const accountRows=(accounts.data||[]).map((row:any)=>{const franchise=Array.isArray(row.franchises)?row.franchises[0]:row.franchises;return {franchiseId:row.franchise_id,franchiseName:franchise?.name||row.franchise_id,displayName:row.display_name,username:row.username,role:row.role,ready:!row.must_change_password}});
    const keeperChoices=(submissions.data||[]).reduce((sum,row:any)=>sum+(Array.isArray(row.choices)?row.choices.length:0),0);
    const validKeepers=(eligibility.data||[]).filter((row:any)=>row.eligible&&row.roster_verified&&row.cost_verified&&row.pick_verified).length;
    const checks=[
      {key:"sleeper",label:"Sleeper connection",ok:live.connected,detail:live.draft?`${live.draft.status} · ${live.picks.length}/${live.expectedPicks} picks`:"Draft not found"},
      {key:"keepers",label:"Official keepers",ok:windowResult.data?.status==="locked"&&keeperChoices===30&&validKeepers===30,detail:`${keeperChoices}/30 choices · ${validKeepers}/30 verified · ${windowResult.data?.status||"missing"}`},
      {key:"identities",label:"Identity mapping",ok:snapshot?.integrity?.mapped_rosters===10&&!(snapshot?.integrity?.unresolved_users?.length||snapshot?.integrity?.unresolved_rosters?.length),detail:`${snapshot?.integrity?.mapped_rosters||0}/10 rosters mapped`},
      {key:"accounts",label:"Manager accounts",ok:accountRows.length===10&&accountRows.every((row)=>row.ready),detail:`${accountRows.filter((row)=>row.ready).length}/${accountRows.length} ready`},
      {key:"database",label:"Sleeper ↔ OKFL picks",ok:!live.mismatch,detail:`Sleeper ${live.picks.length} · OKFL ${live.storedPicks}`},
    ];
    return NextResponse.json({ready:checks.every((check)=>check.ok),checks,live,accounts:accountRows,lastSync:snapshot?.latest_sync_run||null,checkedAt:new Date().toISOString()},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:500})}
}
