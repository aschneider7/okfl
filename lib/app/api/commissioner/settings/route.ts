import {NextResponse} from "next/server";
import {getAccountFromRequest} from "@/lib/accountServer";
import {firebasePushIsConfigured,sendFirebasePush} from "@/lib/firebasePush";
import {mapRule,mapSettings,OKFL_SETTINGS_LEAGUE_ID,settingsMigrationMissing} from "@/lib/leagueSettings";
import {createAdminSupabase} from "@/lib/supabaseServer";

async function commissioner(request:Request){const account=await getAccountFromRequest(request);return account?.role==="commissioner"&&!account.mustChangePassword?account:null}
function clean(value:unknown,max:number){return String(value||"").trim().replace(/\s+/g," ").slice(0,max)}
async function audit(supabase:any,account:any,action:string,entityType:string,entityKey:string,before:any,after:any,note?:string){
  const {error}=await supabase.from("commissioner_audit_log").insert({league_id:OKFL_SETTINGS_LEAGUE_ID,season:2026,action,entity_type:entityType,entity_key:entityKey,before_data:before||null,after_data:after||null,note:note||null});if(error)throw error;
}
function migrationResponse(){return NextResponse.json({error:"Run supabase/011_commissioner_settings.sql in the Supabase SQL Editor, then reload this page.",migrationRequired:true},{status:503})}

export async function GET(request:Request){
  try{
    if(!await commissioner(request))return NextResponse.json({error:"Commissioner account required."},{status:403});
    const supabase=createAdminSupabase();
    const [settingsResult,rulesResult,accountsResult,devicesResult]=await Promise.all([
      supabase.from("league_settings").select("*").eq("league_id",OKFL_SETTINGS_LEAGUE_ID).maybeSingle(),
      supabase.from("league_rules").select("id,category,rule,status,sort_order,updated_at").eq("league_id",OKFL_SETTINGS_LEAGUE_ID).order("sort_order").order("id"),
      supabase.from("franchise_accounts").select("user_id,franchise_id,display_name,franchises(name)").order("franchise_id"),
      supabase.from("manager_push_devices").select("user_id,installation_id,platform,last_seen_at").eq("enabled",true),
    ]);
    if(settingsResult.error)throw settingsResult.error;if(rulesResult.error)throw rulesResult.error;if(accountsResult.error)throw accountsResult.error;if(devicesResult.error)throw devicesResult.error;
    const devices=devicesResult.data||[];
    const managers=(accountsResult.data||[]).map((row:any)=>{const franchise=Array.isArray(row.franchises)?row.franchises[0]:row.franchises;const owned=devices.filter((device:any)=>device.user_id===row.user_id);return {userId:row.user_id,franchiseId:row.franchise_id,displayName:row.display_name,franchise:franchise?.name||row.franchise_id,devices:owned.length,lastSeenAt:owned.map((device:any)=>device.last_seen_at).sort().at(-1)||null,platforms:[...new Set(owned.map((device:any)=>device.platform))]};});
    return NextResponse.json({settings:mapSettings(settingsResult.data),rules:(rulesResult.data||[]).map(mapRule),managers,pushConfigured:firebasePushIsConfigured()});
  }catch(error){if(settingsMigrationMissing(error))return migrationResponse();return NextResponse.json({error:error instanceof Error?error.message:"Could not load Commissioner settings."},{status:500})}
}

export async function PATCH(request:Request){
  try{
    const account=await commissioner(request);if(!account)return NextResponse.json({error:"Commissioner account required."},{status:403});
    const body=await request.json().catch(()=>({}));const title=clean(body.noticeTitle,80),noticeBody=clean(body.noticeBody,300),href=clean(body.noticeHref,300),version=clean(body.rulebookVersion,30)||"2026.1";
    if(href&&!href.startsWith("/"))return NextResponse.json({error:"Notice links must begin with /."},{status:400});
    if(body.noticeActive&&(!title||!noticeBody))return NextResponse.json({error:"An active notice needs a title and message."},{status:400});
    const supabase=createAdminSupabase();const {data:before,error:beforeError}=await supabase.from("league_settings").select("*").eq("league_id",OKFL_SETTINGS_LEAGUE_ID).maybeSingle();if(beforeError)throw beforeError;
    const payload={league_id:OKFL_SETTINGS_LEAGUE_ID,rulebook_version:version,notice_active:Boolean(body.noticeActive),notice_title:title,notice_body:noticeBody,notice_href:href,updated_by:account.userId,updated_at:new Date().toISOString()};
    const {data,error}=await supabase.from("league_settings").upsert(payload,{onConflict:"league_id"}).select("*").single();if(error)throw error;await audit(supabase,account,"update_settings","league_settings",OKFL_SETTINGS_LEAGUE_ID,before,data);
    return NextResponse.json({ok:true,settings:mapSettings(data)});
  }catch(error){if(settingsMigrationMissing(error))return migrationResponse();return NextResponse.json({error:error instanceof Error?error.message:"Could not save Commissioner settings."},{status:500})}
}

export async function POST(request:Request){
  try{
    const account=await commissioner(request);if(!account)return NextResponse.json({error:"Commissioner account required."},{status:403});
    const body=await request.json().catch(()=>({}));const action=String(body.action||"");const supabase=createAdminSupabase();
    if(action==="save-rule"){
      const id=clean(body.id,12).toUpperCase(),category=clean(body.category,50),rule=String(body.rule||"").trim().slice(0,1000),status=body.status==="draft"?"draft":"published",sortOrder=Math.max(0,Math.floor(Number(body.sortOrder)||0));
      if(!/^[A-Z]{2,5}-[0-9]{3}$/.test(id))return NextResponse.json({error:"Rule IDs must look like LG-001 or KEEP-001."},{status:400});if(category.length<2||rule.length<5)return NextResponse.json({error:"Add a category and a complete rule."},{status:400});
      const {data:before,error:beforeError}=await supabase.from("league_rules").select("*").eq("id",id).maybeSingle();if(beforeError)throw beforeError;
      const payload={id,league_id:OKFL_SETTINGS_LEAGUE_ID,category,rule,status,sort_order:sortOrder,created_by:before?.created_by||account.userId,updated_by:account.userId,updated_at:new Date().toISOString()};const {data,error}=await supabase.from("league_rules").upsert(payload,{onConflict:"id"}).select("*").single();if(error)throw error;await audit(supabase,account,before?"update_rule":"create_rule","league_rule",id,before,data);
      return NextResponse.json({ok:true,rule:mapRule(data)});
    }
    if(action==="seed-rules"){
      const incoming=Array.isArray(body.rules)?body.rules.slice(0,100):[];if(!incoming.length)return NextResponse.json({error:"No official rules were provided."},{status:400});
      const rows=incoming.map((item:any,index:number)=>({id:clean(item.id,12).toUpperCase(),league_id:OKFL_SETTINGS_LEAGUE_ID,category:clean(item.category,50),rule:String(item.rule||"").trim().slice(0,1000),status:"published",sort_order:index+1,created_by:account.userId,updated_by:account.userId,updated_at:new Date().toISOString()})).filter((item:any)=>/^[A-Z]{2,5}-[0-9]{3}$/.test(item.id)&&item.category.length>=2&&item.rule.length>=5);
      const {error}=await supabase.from("league_rules").upsert(rows,{onConflict:"id"});if(error)throw error;const {error:settingsError}=await supabase.from("league_settings").update({rulebook_managed:true,updated_by:account.userId,updated_at:new Date().toISOString()}).eq("league_id",OKFL_SETTINGS_LEAGUE_ID);if(settingsError)throw settingsError;await audit(supabase,account,"import_rules","league_rule","official-rulebook",null,{count:rows.length});return NextResponse.json({ok:true,count:rows.length});
    }
    if(action==="delete-rule"){
      const id=clean(body.id,12).toUpperCase();const {data:before,error:beforeError}=await supabase.from("league_rules").select("*").eq("id",id).maybeSingle();if(beforeError)throw beforeError;if(!before)return NextResponse.json({error:"Rule not found."},{status:404});const {error}=await supabase.from("league_rules").delete().eq("id",id);if(error)throw error;await audit(supabase,account,"delete_rule","league_rule",id,before,null);return NextResponse.json({ok:true});
    }
    if(action==="test-push"){
      const userId=String(body.userId||"");const {data:devices,error}=await supabase.from("manager_push_devices").select("installation_id").eq("user_id",userId).eq("enabled",true);if(error)throw error;if(!devices?.length)return NextResponse.json({error:"This manager has no enabled devices."},{status:400});const results=await sendFirebasePush(devices.map((item:any)=>item.installation_id),{kind:"announcement",title:"OKFL notifications are working",body:"This is a Commissioner test from OKFL OS.",url:"/account"});const sent=results.filter((item)=>item.status==="queued").length;await audit(supabase,account,"test_push","manager_push_devices",userId,null,{sent,failed:results.length-sent});return NextResponse.json({ok:sent>0,sent,failed:results.length-sent,...(!sent?{error:results.find((item)=>item.error)?.error||"Firebase did not accept the test notification."}:{})},{status:sent?200:502});
    }
    return NextResponse.json({error:"Unknown Commissioner action."},{status:400});
  }catch(error){if(settingsMigrationMissing(error))return migrationResponse();return NextResponse.json({error:error instanceof Error?error.message:"Commissioner action failed."},{status:500})}
}
