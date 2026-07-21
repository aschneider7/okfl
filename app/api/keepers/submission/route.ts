import {NextResponse} from "next/server";
import {getAccountFromRequest} from "@/lib/accountServer";
import {KEEPER_SEASON,normalizeKeeperChoices,validateKeeperChoices} from "@/lib/keeperSubmission";
import {keeperServerError} from "@/lib/serverError";
import {createAdminSupabase} from "@/lib/supabaseServer";

async function snapshot(franchiseId:string){
  const supabase=createAdminSupabase();
  const [{data:window,error:windowError},{data:submission,error:submissionError},{data:locked,error:lockedError},{data:eligibility,error:eligibilityError}]=await Promise.all([
    supabase.from("keeper_windows").select("season,deadline,status,locked_at,updated_at").eq("season",KEEPER_SEASON).maybeSingle(),
    supabase.from("keeper_submissions").select("id,season,franchise_id,choices,status,revision,changed_after_submission,submitted_at,updated_at").eq("season",KEEPER_SEASON).eq("franchise_id",franchiseId).maybeSingle(),
    supabase.from("keeper_submissions").select("franchise_id,choices,status").eq("season",KEEPER_SEASON).eq("status","locked"),
    supabase.from("keeper_eligibility").select("franchise_id,player_key,player,position,round,roster_verified,cost_verified,pick_verified,eligible,note").eq("season",KEEPER_SEASON).eq("franchise_id",franchiseId).eq("eligible",true).order("round"),
  ]);
  if(windowError||submissionError||lockedError||eligibilityError)throw windowError||submissionError||lockedError||eligibilityError;
  if(!window)throw new Error("Official keeper setup is not installed yet. Run migration 006.");
  return {window,submission,eligibility:eligibility||[],officialBoard:window.status==="locked"?(locked||[]):[]};
}

function accessError(account:Awaited<ReturnType<typeof getAccountFromRequest>>){
  if(!account)return NextResponse.json({error:"Sign in to manage your franchise keepers."},{status:401});
  if(account.mustChangePassword)return NextResponse.json({error:"Create your permanent password before submitting keepers."},{status:403});
  return null;
}

export async function GET(request:Request){
  try{
    const account=await getAccountFromRequest(request);
    const denied=accessError(account);if(denied)return denied;
    return NextResponse.json({...await snapshot(account!.franchiseId),account});
  }catch(error){return NextResponse.json({error:keeperServerError(error,"Could not load keeper submission.")},{status:500})}
}

export async function PUT(request:Request){
  try{
    const account=await getAccountFromRequest(request);
    const denied=accessError(account);if(denied)return denied;
    const body=await request.json().catch(()=>({}));
    const action=String(body.action||"save");
    if(action!=="save"&&action!=="submit")return NextResponse.json({error:"Unknown keeper action."},{status:400});
    const choices=normalizeKeeperChoices(body.choices);
    const supabase=createAdminSupabase();
    const {data:window,error:windowError}=await supabase.from("keeper_windows").select("season,deadline,status").eq("season",KEEPER_SEASON).maybeSingle();
    if(windowError)throw windowError;
    if(!window)return NextResponse.json({error:"Official keeper setup is not installed yet. Run migration 006."},{status:503});
    if(window.status!=="open")return NextResponse.json({error:"The official keeper board is locked."},{status:409});
    if(window.deadline&&Date.parse(window.deadline)<=Date.now())return NextResponse.json({error:"The keeper deadline has passed. Contact the commissioner."},{status:409});

    if(action==="submit"){
      const issues=validateKeeperChoices(choices,true);
      if(issues.length)return NextResponse.json({error:"Fix the keeper submission before confirming it.",issues},{status:422});
    }
    const {error}=await supabase.rpc("save_official_keeper_submission",{p_user_id:account!.userId,p_franchise_id:account!.franchiseId,p_choices:choices,p_action:action});
    if(error)return NextResponse.json({error:error.message},{status:422});
    return NextResponse.json({...await snapshot(account!.franchiseId),account});
  }catch(error){return NextResponse.json({error:keeperServerError(error,"Could not save keeper submission.")},{status:500})}
}
