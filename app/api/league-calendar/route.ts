import {NextResponse} from "next/server";
import {calendarMigrationMissing,mapCalendarEvent,CALENDAR_LEAGUE_ID,type LeagueCalendarEvent} from "@/lib/leagueCalendar";
import {createAdminSupabase} from "@/lib/supabaseServer";

export const dynamic="force-dynamic";

export async function GET(){
  const supabase=createAdminSupabase();
  try{
    const [eventsResult,keeperResult,votesResult]=await Promise.all([
      supabase.from("league_calendar_events").select("id,title,description,category,starts_at,ends_at,all_day,href").eq("league_id",CALENDAR_LEAGUE_ID).eq("status","published").order("starts_at"),
      supabase.from("keeper_windows").select("season,deadline,status").eq("season",2026).maybeSingle(),
      supabase.from("league_communications").select("id,title,closes_at,status").eq("kind","poll").eq("status","open").not("closes_at","is",null).order("closes_at"),
    ]);
    if(eventsResult.error)throw eventsResult.error;
    const events:LeagueCalendarEvent[]=(eventsResult.data||[]).map(mapCalendarEvent);
    if(keeperResult.data?.deadline)events.push({id:`keeper-${keeperResult.data.season}`,title:"Keeper submission deadline",description:"All franchises must confirm and submit their official keepers before this time.",category:"keeper",startsAt:String(keeperResult.data.deadline),endsAt:null,allDay:false,href:"/keepers",source:"keepers",editable:false});
    if(!votesResult.error)for(const vote of votesResult.data||[])events.push({id:`vote-${vote.id}`,title:`Vote closes: ${vote.title}`,description:"Final deadline to submit or change your franchise vote.",category:"vote",startsAt:String(vote.closes_at),endsAt:null,allDay:false,href:`/league-votes?message=${vote.id}`,source:"vote",editable:false});
    events.sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
    return NextResponse.json({events,migrationRequired:false},{headers:{"Cache-Control":"public, max-age=30, s-maxage=60"}});
  }catch(error){
    if(calendarMigrationMissing(error))return NextResponse.json({events:[],migrationRequired:true});
    return NextResponse.json({error:error instanceof Error?error.message:"Could not load the league calendar."},{status:500});
  }
}
