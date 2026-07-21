import {NextResponse} from "next/server";
import archive from "@/public/data/okfl.json";
import type {OKFLData} from "@/lib/types";
import {getAccountFromRequest} from "@/lib/accountServer";
import {createAdminSupabase} from "@/lib/supabaseServer";
import {readSleeperSnapshot} from "@/lib/sleeperSync";
import {readLatestLivePowerSnapshot} from "@/lib/livePowerStore";
import {buildMyFranchiseDashboard} from "@/lib/myFranchise";
import {KEEPER_SEASON} from "@/lib/keeperSubmission";

export const runtime="nodejs";
export const maxDuration=60;

async function requireAccount(request:Request){
  const account=await getAccountFromRequest(request);
  if(!account||account.mustChangePassword)return null;
  return account;
}

export async function GET(request:Request){
  try{
    const account=await requireAccount(request);if(!account)return NextResponse.json({error:"Authenticated franchise account required."},{status:401});
    const supabase=createAdminSupabase();
    const [snapshot,powerSnapshot,directoryResponse,profileResult,notificationResult,activityResult,keeperResult]=await Promise.all([
      readSleeperSnapshot().catch(()=>null),readLatestLivePowerSnapshot().catch(()=>null),fetch("https://api.sleeper.app/v1/players/nfl",{next:{revalidate:60*60*24}}),
      supabase.from("manager_profiles").select("team_display_name,avatar_url,primary_color,accent_color,bio,motto").eq("user_id",account.userId).maybeSingle(),
      supabase.from("manager_notifications").select("id,kind,title,body,href,read_at,created_at").eq("user_id",account.userId).order("created_at",{ascending:false}).limit(30),
      supabase.from("manager_activity").select("id,event_type,title,detail,created_at").eq("user_id",account.userId).order("created_at",{ascending:false}).limit(20),
      supabase.from("keeper_submissions").select("choices,status,submitted_at").eq("season",KEEPER_SEASON).eq("franchise_id",account.franchiseId).maybeSingle(),
    ]);
    const databaseError=profileResult.error||notificationResult.error||activityResult.error;
    if(databaseError&&String(databaseError.message).toLowerCase().includes("does not exist"))return NextResponse.json({error:"Manager Hub setup is not installed yet. Run migration 007."},{status:503});
    if(databaseError)throw databaseError;
    const directory=directoryResponse.ok?await directoryResponse.json():{};
    const dashboard=buildMyFranchiseDashboard({account,data:archive as unknown as OKFLData,snapshot,powerSnapshot,directory,profile:profileResult.data,notifications:notificationResult.data||[],activity:activityResult.data||[],keeperSubmission:keeperResult.data});
    return NextResponse.json({dashboard},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not load My Franchise."},{status:500})}
}

export async function PATCH(request:Request){
  try{
    const account=await requireAccount(request);if(!account)return NextResponse.json({error:"Authenticated franchise account required."},{status:401});
    const body=await request.json().catch(()=>({}));const action=String(body.action||"");const supabase=createAdminSupabase();const now=new Date().toISOString();
    if(action==="profile"){
      const text=(value:unknown,max:number)=>String(value||"").trim().slice(0,max);const primaryColor=text(body.profile?.primaryColor,7);const accentColor=text(body.profile?.accentColor,7);const avatarUrl=text(body.profile?.avatarUrl,500);
      if(!/^#[0-9a-f]{6}$/i.test(primaryColor)||!/^#[0-9a-f]{6}$/i.test(accentColor))return NextResponse.json({error:"Brand colors must use six-digit hex values."},{status:422});
      if(avatarUrl&&!/^https:\/\//i.test(avatarUrl))return NextResponse.json({error:"Avatar URL must begin with https://"},{status:422});
      const payload={user_id:account.userId,franchise_id:account.franchiseId,team_display_name:text(body.profile?.teamDisplayName,50)||account.franchiseName,avatar_url:avatarUrl||null,primary_color:primaryColor,accent_color:accentColor,bio:text(body.profile?.bio,280)||null,motto:text(body.profile?.motto,100)||null,updated_at:now};
      const {error}=await supabase.from("manager_profiles").upsert(payload,{onConflict:"user_id"});if(error)throw error;
      await supabase.from("manager_activity").insert({user_id:account.userId,franchise_id:account.franchiseId,event_type:"profile",title:"Manager profile updated",detail:"Team branding and public manager identity were refreshed."});
    }else if(action==="read"){
      const id=String(body.id||"");if(!id)return NextResponse.json({error:"Notification id is required."},{status:400});
      const {error}=await supabase.from("manager_notifications").update({read_at:now}).eq("id",id).eq("user_id",account.userId);if(error)throw error;
    }else if(action==="read-all"){
      const {error}=await supabase.from("manager_notifications").update({read_at:now}).eq("user_id",account.userId).is("read_at",null);if(error)throw error;
    }else return NextResponse.json({error:"Unknown franchise-dashboard action."},{status:400});
    return NextResponse.json({ok:true});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not update My Franchise."},{status:500})}
}
