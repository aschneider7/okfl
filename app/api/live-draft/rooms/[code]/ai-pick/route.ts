import {NextResponse} from "next/server";
import {draftPlayerKey} from "@/lib/draftRankings";
import {overallToRoundSlot} from "@/lib/draftSimulator";
import {chooseLiveDraftAiPlayer} from "@/lib/liveDraftAi";
import {getLiveDraftSnapshot} from "@/lib/liveDraftServer";
import {createAdminSupabase} from "@/lib/supabaseServer";
import {getAccountFromRequest} from "@/lib/accountServer";

export async function POST(request: Request, context: {params: Promise<{code: string}>}) {
  try {
    const account=await getAccountFromRequest(request);
    if(!account||account.mustChangePassword)return NextResponse.json({error:"League account required."},{status:401});
    const {code} = await context.params;
    const normalized = code.trim().toUpperCase();
    const supabase = createAdminSupabase();
    const {data: room} = await supabase.from("live_draft_rooms").select("id,status,current_overall,host_token_hash").eq("code", normalized).maybeSingle();
    if (!room) return NextResponse.json({error: "Draft room not found."}, {status: 404});
    if (room.status !== "live") return NextResponse.json({error: "The room is not live."}, {status: 409});
    const snapshot = await getLiveDraftSnapshot(normalized);
    if (!snapshot) return NextResponse.json({error: "Draft room not found."}, {status: 404});
    const spot = overallToRoundSlot(room.current_overall);
    const seat = snapshot.seats.find((row) => row.slot === spot.slot);
    if (seat?.claimed) return NextResponse.json({error: `${seat.claimedName || seat.managerName} controls this pick.`}, {status: 409});
    const player = chooseLiveDraftAiPlayer(snapshot, room.current_overall);
    if (!player) return NextResponse.json({error: "No available player was found."}, {status: 409});
    const {error} = await supabase.rpc("make_live_draft_pick", {
      p_room_code: normalized,
      p_actor_token_hash: room.host_token_hash,
      p_player: {...player, key: draftPlayerKey(player.name)},
      p_expected_overall: room.current_overall,
    });
    if (error) {
      const latest = await getLiveDraftSnapshot(normalized);
      if (latest && latest.room.currentOverall !== room.current_overall) return NextResponse.json({snapshot: latest});
      return NextResponse.json({error: error.message}, {status: 409});
    }
    return NextResponse.json({snapshot: await getLiveDraftSnapshot(normalized)});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : "Could not make the AI pick."}, {status: 500});
  }
}
