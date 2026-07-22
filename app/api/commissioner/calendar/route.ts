import {NextResponse} from "next/server";
import {getAccountFromRequest} from "@/lib/accountServer";
import {calendarCategories,calendarMigrationMissing,mapCalendarEvent,CALENDAR_LEAGUE_ID} from "@/lib/leagueCalendar";
import {firebasePushIsConfigured,sendFirebasePush} from "@/lib/firebasePush";
import {createAdminSupabase} from "@/lib/supabaseServer";

async function commissioner(request:Request){const account=await getAccountFromRequest(request);return account?.role==="commissioner"&&!account.mustChangePassword?account:null}
function migrationResponse(){return NextResponse.json({error:"Run supabase/013_league_calendar.sql in the Supabase SQL Editor, then reload this page.",migrationRequired:true},{status:503})}
function text(value:unknown,max:number){return String(value||"").trim().replace(/\s+/g," ").slice(0,max)}
async function audit(supabase:any,action:string,key:string,before:any,after:any){await supabase.from("commissioner_audit_log").insert({league_id:CALENDAR_LEAGUE_ID,season:2026,action,entity_type:"calendar_event",entity_key:key,before_data:before||null,after_data:after||null})}

export async function GET(request:Request){
  try{if(!await commissioner(request))return NextResponse.json({error:"Commissioner account required."},{status:403});const supabase=createAdminSupabase();const {data,error}=await supabase.from("league_calendar_events").select("*").eq("league_id",CALENDAR_LEAGUE_ID).order("starts_at");if(error)throw error;return NextResponse.json({events:(data||[]).map(mapCalendarEvent)});}catch(error){if(calendarMigrationMissing(error))return migrationResponse();return NextResponse.json({error:error instanceof Error?error.message:"Could not load calendar controls."},{status:500})}
}

export async function POST(request:Request){
  try{
    const account=await commissioner(request);if(!account)return NextResponse.json({error:"Commissioner account required."},{status:403});
    const body=await request.json().catch(()=>({})),action=String(body.action||"save"),supabase=createAdminSupabase(),id=String(body.id||"");
    if(action==="delete"){
      const {data:before,error:readError}=await supabase.from("league_calendar_events").select("*").eq("id",id).eq("league_id",CALENDAR_LEAGUE_ID).maybeSingle();if(readError)throw readError;if(!before)return NextResponse.json({error:"Calendar event not found."},{status:404});
      const {error}=await supabase.from("league_calendar_events").delete().eq("id",id).eq("league_id",CALENDAR_LEAGUE_ID);if(error)throw error;await audit(supabase,"delete_calendar_event",id,before,null);return NextResponse.json({ok:true});
    }
    if(action==="notify"){
      const {data:event,error:eventError}=await supabase.from("league_calendar_events").select("id,title,description,starts_at,all_day").eq("id",id).eq("league_id",CALENDAR_LEAGUE_ID).maybeSingle();if(eventError)throw eventError;if(!event)return NextResponse.json({error:"Calendar event not found."},{status:404});
      const {data:accounts,error:accountError}=await supabase.from("franchise_accounts").select("user_id");if(accountError)throw accountError;const when=new Date(event.starts_at).toLocaleString("en-US",{timeZone:"America/New_York",dateStyle:"medium",...(event.all_day?{}:{timeStyle:"short"})});const message=`${when} ET${event.description?` — ${event.description}`:""}`.slice(0,1000);const targets=accounts||[];
      const {error:noticeError}=await supabase.from("manager_notifications").insert(targets.map((target:any)=>({user_id:target.user_id,kind:"notification",title:event.title,body:message,href:"/calendar"})));if(noticeError)throw noticeError;
      let queued=0,failed=0;if(firebasePushIsConfigured()&&targets.length){const {data:devices,error:deviceError}=await supabase.from("manager_push_devices").select("installation_id").in("user_id",targets.map((target:any)=>target.user_id)).eq("enabled",true);if(deviceError)throw deviceError;const results=await sendFirebasePush((devices||[]).map((device:any)=>device.installation_id),{kind:"announcement",title:event.title,body:message,url:"/calendar"});queued=results.filter((item)=>item.status==="queued").length;failed=results.length-queued;}
      await audit(supabase,"notify_calendar_event",id,null,{recipients:targets.length,queued,failed});return NextResponse.json({ok:true,recipients:targets.length,queued,failed});
    }
    const title=text(body.title,100),description=String(body.description||"").trim().slice(0,1000),category=calendarCategories.includes(body.category)?body.category:"league",startsAt=new Date(String(body.startsAt||"")),endsAt=body.endsAt?new Date(String(body.endsAt)):null,href=text(body.href,300);
    if(title.length<3)return NextResponse.json({error:"Use an event title of at least three characters."},{status:400});if(Number.isNaN(startsAt.getTime())||endsAt&&Number.isNaN(endsAt.getTime()))return NextResponse.json({error:"Choose a valid event date and time."},{status:400});if(endsAt&&endsAt<startsAt)return NextResponse.json({error:"The end time cannot be before the start time."},{status:400});if(href&&!href.startsWith("/"))return NextResponse.json({error:"Event links must begin with /."},{status:400});
    const payload={league_id:CALENDAR_LEAGUE_ID,title,description,category,starts_at:startsAt.toISOString(),ends_at:endsAt?.toISOString()||null,all_day:Boolean(body.allDay),href,status:"published",updated_by:account.userId,updated_at:new Date().toISOString()};
    if(id){const {data:before,error:readError}=await supabase.from("league_calendar_events").select("*").eq("id",id).eq("league_id",CALENDAR_LEAGUE_ID).maybeSingle();if(readError)throw readError;if(!before)return NextResponse.json({error:"Calendar event not found."},{status:404});const {data,error}=await supabase.from("league_calendar_events").update(payload).eq("id",id).select("*").single();if(error)throw error;await audit(supabase,"update_calendar_event",id,before,data);return NextResponse.json({ok:true,event:mapCalendarEvent(data)});}
    const {data,error}=await supabase.from("league_calendar_events").insert({...payload,created_by:account.userId}).select("*").single();if(error)throw error;await audit(supabase,"create_calendar_event",data.id,null,data);return NextResponse.json({ok:true,event:mapCalendarEvent(data)},{status:201});
  }catch(error){if(calendarMigrationMissing(error))return migrationResponse();return NextResponse.json({error:error instanceof Error?error.message:"Calendar action failed."},{status:500})}
}
