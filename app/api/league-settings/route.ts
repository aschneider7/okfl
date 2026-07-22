import {NextResponse} from "next/server";
import {createAdminSupabase} from "@/lib/supabaseServer";
import {defaultLeagueSettings,mapRule,mapSettings,OKFL_SETTINGS_LEAGUE_ID,settingsMigrationMissing} from "@/lib/leagueSettings";

export async function GET(){
  try{
    const supabase=createAdminSupabase();
    const [settingsResult,rulesResult]=await Promise.all([
      supabase.from("league_settings").select("rulebook_version,rulebook_managed,notice_active,notice_title,notice_body,notice_href,updated_at").eq("league_id",OKFL_SETTINGS_LEAGUE_ID).maybeSingle(),
      supabase.from("league_rules").select("id,category,rule,status,sort_order,updated_at").eq("league_id",OKFL_SETTINGS_LEAGUE_ID).eq("status","published").order("sort_order").order("id"),
    ]);
    if(settingsResult.error)throw settingsResult.error;if(rulesResult.error)throw rulesResult.error;
    return NextResponse.json({settings:mapSettings(settingsResult.data),rules:(rulesResult.data||[]).map(mapRule),managedRulebook:Boolean(settingsResult.data?.rulebook_managed)});
  }catch(error){
    if(settingsMigrationMissing(error))return NextResponse.json({settings:defaultLeagueSettings,rules:[],managedRulebook:false});
    return NextResponse.json({settings:defaultLeagueSettings,rules:[],managedRulebook:false},{status:200});
  }
}
