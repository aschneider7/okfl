import {NextResponse} from "next/server";
import {getAccountFromRequest} from "@/lib/accountServer";
import {crossTeamKeeperIssues,KEEPER_SEASON,normalizeKeeperChoices,validateKeeperChoices} from "@/lib/keeperSubmission";
import {createAdminSupabase} from "@/lib/supabaseServer";

async function commissioner(request:Request){
  const account=await getAccountFromRequest(request);
  return account?.role==="commissioner"&&!account.mustChangePassword?account:null;
}

async function dashboard(){
  const supabase=createAdminSupabase();
  const [{data:window,error:windowError},{data:accounts,error:accountsError},{data:submissions,error:submissionsError}]=await Promise.all([
    supabase.from("keeper_windows").select("season,deadline,status,locked_at,updated_at").eq("season",KEEPER_SEASON).maybeSingle(),
    supabase.from("franchise_accounts").select("franchise_id,display_name,username,franchises(name)").order("franchise_id"),
    supabase.from("keeper_submissions").select("id,franchise_id,choices,status,revision,changed_after_submission,submitted_at,updated_at").eq("season",KEEPER_SEASON),
  ]);
  if(windowError||accountsError||submissionsError)throw windowError||accountsError||submissionsError;
  if(!window)throw new Error("Official keeper setup is not installed yet. Run migration 006.");
  const rows=(submissions||[]).map((row)=>({franchise_id:row.franchise_id,choices:row.choices}));
  const cross=crossTeamKeeperIssues(rows);
  const byFranchise=new Map((submissions||[]).map((row)=>[row.franchise_id,row]));
  const teams=(accounts||[]).map((account:any)=>{
    const submission:any=byFranchise.get(account.franchise_id);
    const choices=normalizeKeeperChoices(submission?.choices);
    const issues=submission?[...validateKeeperChoices(choices,true),...(cross.get(account.franchise_id)||[])]:[];
    const franchise=Array.isArray(account.franchises)?account.franchises[0]:account.franchises;
    return {franchiseId:account.franchise_id,franchiseName:franchise?.name||account.franchise_id,manager:account.display_name,username:account.username,
      status:submission?.status||"missing",choices,issues,revision:submission?.revision||0,changedAfterSubmission:Boolean(submission?.changed_after_submission),
      submittedAt:submission?.submitted_at||null,updatedAt:submission?.updated_at||null};
  });
  return {window,teams,summary:{submitted:teams.filter((team)=>team.status==="submitted"||team.status==="locked").map((team)=>team.franchiseId),
    missing:teams.filter((team)=>team.status!=="submitted"&&team.status!=="locked").map((team)=>team.franchiseId),invalid:teams.filter((team)=>team.issues.length).map((team)=>team.franchiseId),
    changed:teams.filter((team)=>team.changedAfterSubmission).map((team)=>team.franchiseId)}};
}

export async function GET(request:Request){
  try{if(!await commissioner(request))return NextResponse.json({error:"Commissioner access required."},{status:403});return NextResponse.json(await dashboard())}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not load keeper control room."},{status:500})}
}

export async function PATCH(request:Request){
  try{
    const account=await commissioner(request);if(!account)return NextResponse.json({error:"Commissioner access required."},{status:403});
    const body=await request.json().catch(()=>({}));const action=String(body.action||"");const supabase=createAdminSupabase();const now=new Date().toISOString();
    if(action==="deadline"){
      const deadline=body.deadline?new Date(String(body.deadline)):null;
      if(deadline&&Number.isNaN(deadline.getTime()))return NextResponse.json({error:"Choose a valid deadline."},{status:400});
      const {error}=await supabase.from("keeper_windows").update({deadline:deadline?.toISOString()||null,updated_at:now}).eq("season",KEEPER_SEASON).eq("status","open");if(error)throw error;
    }else if(action==="lock"){
      const current=await dashboard();
      if(current.summary.missing.length)return NextResponse.json({error:`${current.summary.missing.length} franchise${current.summary.missing.length===1?" is":"s are"} still missing.`},{status:409});
      if(current.summary.invalid.length)return NextResponse.json({error:"Resolve every invalid keeper cost or duplicate player before locking."},{status:409});
      const {data:rows,error:rowsError}=await supabase.from("keeper_submissions").update({status:"locked",updated_at:now}).eq("season",KEEPER_SEASON).eq("status","submitted").select("id,revision,choices");if(rowsError)throw rowsError;
      const {error:windowError}=await supabase.from("keeper_windows").update({status:"locked",locked_at:now,locked_by:account.userId,updated_at:now}).eq("season",KEEPER_SEASON);if(windowError)throw windowError;
      if(rows?.length){const {error:eventError}=await supabase.from("keeper_submission_events").insert(rows.map((row)=>({submission_id:row.id,actor_user_id:account.userId,action:"locked",revision:row.revision,choices:row.choices})));if(eventError)throw eventError}
    }else if(action==="unlock"){
      const {data:rows,error:rowsError}=await supabase.from("keeper_submissions").update({status:"submitted",updated_at:now}).eq("season",KEEPER_SEASON).eq("status","locked").select("id,revision,choices");if(rowsError)throw rowsError;
      const {error:windowError}=await supabase.from("keeper_windows").update({status:"open",locked_at:null,locked_by:null,updated_at:now}).eq("season",KEEPER_SEASON);if(windowError)throw windowError;
      if(rows?.length){const {error:eventError}=await supabase.from("keeper_submission_events").insert(rows.map((row)=>({submission_id:row.id,actor_user_id:account.userId,action:"unlocked",revision:row.revision,choices:row.choices})));if(eventError)throw eventError}
    }else return NextResponse.json({error:"Unknown keeper control action."},{status:400});
    return NextResponse.json(await dashboard());
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not update keeper control room."},{status:500})}
}
