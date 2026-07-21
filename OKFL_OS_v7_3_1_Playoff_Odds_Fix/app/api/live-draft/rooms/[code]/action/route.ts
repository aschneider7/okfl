import {NextResponse} from "next/server";
import {getLiveDraftSnapshot, hashDraftSecret} from "@/lib/liveDraftServer";
import {createAdminSupabase} from "@/lib/supabaseServer";
import {isCommissioner} from "@/lib/commissionerAuth";

export async function POST(request: Request, context: {params: Promise<{code: string}>}) {
  try {
    if(!await isCommissioner(request))return NextResponse.json({error:"Commissioner account required."},{status:403});
    const {code} = await context.params;
    const normalized = code.trim().toUpperCase();
    const body = await request.json();
    const action = String(body.action || "");
    const supabase = createAdminSupabase();
    const {data: room} = await supabase.from("live_draft_rooms").select("id,status,host_token_hash,settings").eq("code", normalized).maybeSingle();
    if (!room) return NextResponse.json({error: "Draft room not found."}, {status: 404});
    if (room.host_token_hash !== hashDraftSecret(String(body.hostToken || ""))) return NextResponse.json({error: "Host access required."}, {status: 403});

    if (action === "start") {
      const {data: picks} = await supabase.from("live_draft_picks").select("overall").eq("room_id", room.id);
      const occupied = new Set((picks || []).map((pick) => pick.overall));
      let firstOpen = 1; while (firstOpen <= 170 && occupied.has(firstOpen)) firstOpen += 1;
      const deadline = firstOpen > 170 ? null : new Date(Date.now() + Math.max(1, Number(room.settings?.clockSeconds) || 30) * 1000).toISOString();
      const {error} = await supabase.from("live_draft_rooms").update({status: firstOpen > 170 ? "complete" : "live", current_overall: Math.min(firstOpen, 171), pick_deadline: deadline, updated_at: new Date().toISOString()}).eq("id", room.id);
      if (error) throw error;
    } else if (action === "pause" || action === "resume") {
      const status = action === "pause" ? "paused" : "live";
      const deadline = action === "pause" ? null : new Date(Date.now() + Math.max(1, Number(room.settings?.clockSeconds) || 30) * 1000).toISOString();
      const {error} = await supabase.from("live_draft_rooms").update({status, pick_deadline: deadline, updated_at: new Date().toISOString()}).eq("id", room.id);
      if (error) throw error;
    } else if (action === "undo") {
      const {data: lastPick} = await supabase.from("live_draft_picks").select("id,overall").eq("room_id", room.id).eq("keeper", false).order("overall", {ascending: false}).limit(1).maybeSingle();
      if (!lastPick) return NextResponse.json({error: "There is no live pick to undo."}, {status: 409});
      const {error: deleteError} = await supabase.from("live_draft_picks").delete().eq("id", lastPick.id);
      if (deleteError) throw deleteError;
      const {error: roomError} = await supabase.from("live_draft_rooms").update({status: "paused", current_overall: lastPick.overall, pick_deadline: null, updated_at: new Date().toISOString()}).eq("id", room.id);
      if (roomError) throw roomError;
    } else {
      return NextResponse.json({error: "Unknown host action."}, {status: 400});
    }
    return NextResponse.json({snapshot: await getLiveDraftSnapshot(normalized)});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : "Could not update the draft room."}, {status: 500});
  }
}
