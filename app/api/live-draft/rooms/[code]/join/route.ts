import {NextResponse} from "next/server";
import {createDraftSecret, getLiveDraftSnapshot, hashDraftSecret, updateAutoDraftSettings} from "@/lib/liveDraftServer";
import {createAdminSupabase} from "@/lib/supabaseServer";
import {getAccountFromRequest} from "@/lib/accountServer";

export async function POST(request: Request, context: {params: Promise<{code: string}>}) {
  try {
    const account=await getAccountFromRequest(request);
    if(!account)return NextResponse.json({error:"Sign in with your league account to claim a live-draft seat."},{status:401});
    if(account.mustChangePassword)return NextResponse.json({error:"Create your permanent password before joining the live draft."},{status:403});
    const {code} = await context.params;
    const normalized = code.trim().toUpperCase();
    const franchiseId = account.franchiseId;
    const displayName = account.displayName;
    const supabase = createAdminSupabase();
    const {data: room} = await supabase.from("live_draft_rooms").select("id,status,settings").eq("code", normalized).maybeSingle();
    if (!room) return NextResponse.json({error: "Draft room not found."}, {status: 404});
    if (room.status === "complete") return NextResponse.json({error: "This draft is complete."}, {status: 409});
    const {data: seat} = await supabase.from("live_draft_seats").select("id,claimed_user_id").eq("room_id", room.id).eq("franchise_id", franchiseId).maybeSingle();
    if (!seat) return NextResponse.json({error: "Your franchise does not have a seat in this room."}, {status: 404});
    if(seat.claimed_user_id&&seat.claimed_user_id!==account.userId)return NextResponse.json({error:"This franchise is already claimed by another account."},{status:409});
    const seatToken = createDraftSecret();
    const {error} = await supabase.from("live_draft_seats").update({
      claimed_user_id:account.userId,claimed_name: displayName, claimed_at: new Date().toISOString(), seat_token_hash: hashDraftSecret(seatToken), updated_at: new Date().toISOString(),
    }).eq("id", seat.id);
    if (error) throw error;
    const {error:roomError}=await supabase.from("live_draft_rooms").update({
      settings:updateAutoDraftSettings(room.settings,franchiseId,false),
      updated_at:new Date().toISOString(),
    }).eq("id",room.id);
    if(roomError)throw roomError;
    return NextResponse.json({snapshot: await getLiveDraftSnapshot(normalized), seatToken, franchiseId, displayName});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : "Could not claim this franchise."}, {status: 500});
  }
}
