import {NextResponse} from "next/server";
import {getAccountFromRequest} from "@/lib/accountServer";
import {firebasePushIsConfigured} from "@/lib/firebasePush";
import {createAdminSupabase} from "@/lib/supabaseServer";

async function manager(request:Request){const account=await getAccountFromRequest(request);return account&&!account.mustChangePassword?account:null}

export async function GET(request:Request){
  try{const account=await manager(request);if(!account)return NextResponse.json({error:"Manager account required."},{status:403});const supabase=createAdminSupabase();const {data,error}=await supabase.from("manager_push_devices").select("installation_id,device_label,platform,last_seen_at,created_at").eq("user_id",account.userId).eq("enabled",true).order("last_seen_at",{ascending:false});if(error)throw error;return NextResponse.json({configured:firebasePushIsConfigured(),devices:(data||[]).map((row:any)=>({installationId:row.installation_id,deviceLabel:row.device_label,platform:row.platform,lastSeenAt:row.last_seen_at,createdAt:row.created_at}))});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not load notification settings."},{status:500});}
}

export async function POST(request:Request){
  try{const account=await manager(request);if(!account)return NextResponse.json({error:"Manager account required."},{status:403});const body=await request.json().catch(()=>({}));const installationId=String(body.installationId||"").trim();if(!/^[A-Za-z0-9_-]{10,200}$/.test(installationId))return NextResponse.json({error:"The device registration was invalid."},{status:400});const now=new Date().toISOString();const supabase=createAdminSupabase();const {error}=await supabase.from("manager_push_devices").upsert({installation_id:installationId,user_id:account.userId,franchise_id:account.franchiseId,device_label:String(body.deviceLabel||"This device").trim().slice(0,80)||"This device",platform:String(body.platform||"web").trim().slice(0,30)||"web",enabled:true,last_seen_at:now,updated_at:now},{onConflict:"installation_id"});if(error)throw error;return NextResponse.json({ok:true,installationId});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not register this device."},{status:500});}
}

export async function DELETE(request:Request){
  try{const account=await manager(request);if(!account)return NextResponse.json({error:"Manager account required."},{status:403});const body=await request.json().catch(()=>({}));const supabase=createAdminSupabase();let query=supabase.from("manager_push_devices").delete().eq("user_id",account.userId);if(body.installationId)query=query.eq("installation_id",String(body.installationId));const {error}=await query;if(error)throw error;return NextResponse.json({ok:true});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not disable notifications."},{status:500});}
}
