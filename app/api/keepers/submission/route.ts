import {NextResponse} from "next/server";
import {getAccountFromRequest} from "@/lib/accountServer";
import {crossTeamKeeperIssues,KEEPER_SEASON,normalizeKeeperChoices,validateKeeperChoices} from "@/lib/keeperSubmission";
import {createAdminSupabase} from "@/lib/supabaseServer";

async function snapshot(franchiseId:string){
  const supabase=createAdminSupabase();
  const [{data:window,error:windowError},{data:submission,error:submissionError},{data:locked,error:lockedError}]=await Promise.all([
    supabase.from("keeper_windows").select("season,deadline,status,locked_at,updated_at").eq("season",KEEPER_SEASON).maybeSingle(),
    supabase.from("keeper_submissions").select("id,season,franchise_id,choices,status,revision,changed_after_submission,submitted_at,updated_at").eq("season",KEEPER_SEASON).eq("franchise_id",franchiseId).maybeSingle(),
    supabase.from("keeper_submissions").select("franchise_id,choices,status").eq("season",KEEPER_SEASON).eq("status","locked"),
  ]);
  if(windowError||submissionError||lockedError)throw windowError||submissionError||lockedError;
  if(!window)throw new Error("Official keeper setup is not installed yet. Run migration 006.");
  return {window,submission,officialBoard:window.status==="locked"?(locked||[]):[]};
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
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not load keeper submission."},{status:500})}
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

    const {data:existing,error:existingError}=await supabase.from("keeper_submissions").select("id,choices,status,revision,submitted_at,changed_after_submission").eq("season",KEEPER_SEASON).eq("franchise_id",account!.franchiseId).maybeSingle();
    if(existingError)throw existingError;
    const changed=JSON.stringify(normalizeKeeperChoices(existing?.choices))!==JSON.stringify(choices);
    if(action==="submit"){
      const issues=validateKeeperChoices(choices,true);
      const {data:otherRows,error:othersError}=await supabase.from("keeper_submissions").select("franchise_id,choices").eq("season",KEEPER_SEASON).in("status",["submitted","locked"]).neq("franchise_id",account!.franchiseId);
      if(othersError)throw othersError;
      const cross=crossTeamKeeperIssues([...(otherRows||[]),{franchise_id:account!.franchiseId,choices}]).get(account!.franchiseId)||[];
      const allIssues=[...issues,...cross];
      if(allIssues.length)return NextResponse.json({error:"Fix the keeper submission before confirming it.",issues:allIssues},{status:422});
    }

    const now=new Date().toISOString();
    const wasSubmitted=Boolean(existing?.submitted_at);
    const nextRevision=(Number(existing?.revision)||0)+(changed||action==="submit"?1:0);
    const status=action==="submit"?"submitted":wasSubmitted&&changed?"draft":existing?.status==="submitted"?"submitted":"draft";
    const payload={season:KEEPER_SEASON,franchise_id:account!.franchiseId,user_id:account!.userId,choices,status,revision:nextRevision,
      changed_after_submission:Boolean(existing?.changed_after_submission||(wasSubmitted&&changed)),submitted_at:action==="submit"?now:existing?.submitted_at||null,updated_at:now};
    const {data:submission,error}=await supabase.from("keeper_submissions").upsert(payload,{onConflict:"season,franchise_id"}).select("id,season,franchise_id,choices,status,revision,changed_after_submission,submitted_at,updated_at").single();
    if(error)throw error;
    const eventAction=action==="submit"?(wasSubmitted?"resubmitted":"submitted"):(wasSubmitted&&changed?"changed_after_submission":"saved");
    if(changed||action==="submit"){
      const {error:eventError}=await supabase.from("keeper_submission_events").insert({submission_id:submission.id,actor_user_id:account!.userId,action:eventAction,revision:nextRevision,choices});
      if(eventError)throw eventError;
    }
    return NextResponse.json({...await snapshot(account!.franchiseId),account});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not save keeper submission."},{status:500})}
}
