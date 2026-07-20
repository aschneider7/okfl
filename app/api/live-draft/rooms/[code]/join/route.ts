import {NextResponse} from "next/server";
import {createDraftSecret, getLiveDraftSnapshot, hashDraftSecret} from "@/lib/liveDraftServer";
import {createAdminSupabase} from "@/lib/supabaseServer";

export async function POST(request: Request, context: {params: Promise<{code: string}>}) {
  try {
    const {code} = await context.params;
    const normalized = code.trim().toUpperCase();
    const body = await request.json();
    const franchiseId = String(body.franchiseId || "");
    const pinHash = hashDraftSecret(String(body.pin || ""));
    const displayName = String(body.displayName || "Manager").trim().slice(0, 40) || "Manager";
    const supabase = createAdminSupabase();
    const {data: room} = await supabase.from("live_draft_rooms").select("id,status").eq("code", normalized).maybeSingle();
    if (!room) return NextResponse.json({error: "Draft room not found."}, {status: 404});
    if (room.status !== "lobby") return NextResponse.json({error: "Franchises lock when the draft starts. This seat is now AI-controlled."}, {status: 409});
    const {data: seat} = await supabase.from("live_draft_seats").select("id,pin_hash").eq("room_id", room.id).eq("franchise_id", franchiseId).maybeSingle();
    if (!seat || seat.pin_hash !== pinHash) return NextResponse.json({error: "That team PIN is incorrect."}, {status: 403});
    const seatToken = createDraftSecret();
    const {error} = await supabase.from("live_draft_seats").update({
      claimed_name: displayName, claimed_at: new Date().toISOString(), seat_token_hash: hashDraftSecret(seatToken), updated_at: new Date().toISOString(),
    }).eq("id", seat.id);
    if (error) throw error;
    return NextResponse.json({snapshot: await getLiveDraftSnapshot(normalized), seatToken, franchiseId, displayName});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : "Could not claim this franchise."}, {status: 500});
  }
}
