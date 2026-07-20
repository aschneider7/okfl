import {NextResponse} from "next/server";
import {draftPlayerKey} from "@/lib/draftRankings";
import {chooseLiveDraftAiPlayer} from "@/lib/liveDraftAi";
import {getLiveDraftSnapshot} from "@/lib/liveDraftServer";
import {createAdminSupabase} from "@/lib/supabaseServer";

export async function POST(request: Request, context: {params: Promise<{code: string}>}) {
  try {
    const {code} = await context.params;
    const normalized = code.trim().toUpperCase();
    const {expectedOverall} = await request.json().catch(() => ({expectedOverall: 0}));
    const expected = Number(expectedOverall);
    const supabase = createAdminSupabase();
    const {data: room} = await supabase.from("live_draft_rooms").select("status,current_overall,host_token_hash,pick_deadline").eq("code", normalized).maybeSingle();
    if (!room) return NextResponse.json({error: "Draft room not found."}, {status: 404});
    if (room.status !== "live" || room.current_overall !== expected) return NextResponse.json({snapshot: await getLiveDraftSnapshot(normalized)});
    if (!room.pick_deadline || Date.parse(room.pick_deadline) > Date.now()) return NextResponse.json({error: "Time remains on the clock."}, {status: 409});
    const snapshot = await getLiveDraftSnapshot(normalized);
    if (!snapshot) return NextResponse.json({error: "Draft room not found."}, {status: 404});
    const player = chooseLiveDraftAiPlayer(snapshot, expected);
    if (!player) return NextResponse.json({error: "No available player was found."}, {status: 409});
    const {error} = await supabase.rpc("make_live_draft_pick", {
      p_room_code: normalized,
      p_actor_token_hash: room.host_token_hash,
      p_player: {...player, key: draftPlayerKey(player.name)},
      p_expected_overall: expected,
    });
    if (error) {
      const latest = await getLiveDraftSnapshot(normalized);
      if (latest && latest.room.currentOverall !== expected) return NextResponse.json({snapshot: latest});
      return NextResponse.json({error: error.message}, {status: 409});
    }
    return NextResponse.json({snapshot: await getLiveDraftSnapshot(normalized)});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : "Could not complete the timed pick."}, {status: 500});
  }
}
