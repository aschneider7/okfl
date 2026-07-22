import {NextResponse} from "next/server";
import {normalizeRecap} from "@/lib/commissionerRecap";
import {createAdminSupabase} from "@/lib/supabaseServer";

export const runtime="nodejs";export const revalidate=30;
export async function GET(request:Request){
  try{const url=new URL(request.url),week=Number(url.searchParams.get("week")||0),supabase=createAdminSupabase();let query=supabase.from("commissioner_recaps").select("*").eq("league_id","okfl").eq("season",2026).eq("status","published").order("week",{ascending:false}).limit(1);if(week)query=query.eq("week",week);const {data,error}=await query.maybeSingle();if(error)throw error;return NextResponse.json({available:Boolean(data),recap:data?normalizeRecap(data):null},{headers:{"Cache-Control":"public, s-maxage=30, stale-while-revalidate=120"}})}catch{return NextResponse.json({available:false,recap:null})}
}
