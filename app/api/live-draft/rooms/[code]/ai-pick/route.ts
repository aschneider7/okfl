import {NextResponse} from "next/server";
import {draftPlayerKey} from "@/lib/draftRankings";
import {fallbackPprPool, managers, overallToRoundSlot, scorePlayer} from "@/lib/draftSimulator";
import {getLiveDraftSnapshot, hashDraftSecret} from "@/lib/liveDraftServer";
import {createAdminSupabase} from "@/lib/supabaseServer";

export async function POST(request: Request, context: {params: Promise<{code: string}>}) {
  try {
    const {code} = await context.params;
    const normalized = code.trim().toUpperCase();
    const body = await request.json();
    const hostTokenHash = hashDraftSecret(String(body.hostToken || ""));
    const supabase = createAdminSupabase();
    const {data: room} = await supabase.from("live_draft_rooms").select("id,status,current_overall,host_token_hash").eq("code", normalized).maybeSingle();
    if (!room) return NextResponse.json({error: "Draft room not found."}, {status: 404});
    if (room.host_token_hash !== hostTokenHash) return NextResponse.json({error: "Host access required."}, {status: 403});
    if (room.status !== "live") return NextResponse.json({error: "The room is not live."}, {status: 409});
    const snapshot = await getLiveDraftSnapshot(normalized);
    if (!snapshot) return NextResponse.json({error: "Draft room not found."}, {status: 404});
    const spot = overallToRoundSlot(room.current_overall);
    const seat = snapshot.seats.find((row) => row.slot === spot.slot);
    if (seat?.claimed) return NextResponse.json({error: `${seat.claimedName || seat.managerName} controls this pick.`}, {status: 409});
    const manager = managers.find((row) => row.slot === spot.slot)!;
    const drafted = new Set(snapshot.picks.map((pick) => draftPlayerKey(pick.player.name)));
    const available = fallbackPprPool().filter((player) => !drafted.has(draftPlayerKey(player.name)));
    const roster = snapshot.picks.filter((pick) => pick.franchiseId === manager.franchiseId).map((pick) => pick.player);
    const seed = [...normalized].reduce((sum, character) => sum + character.charCodeAt(0), 0) + room.current_overall * 97;
    const player = available.sort((a, b) => scorePlayer({player: b, manager, roster, pool: available, round: spot.round, seed}) - scorePlayer({player: a, manager, roster, pool: available, round: spot.round, seed}))[0];
    if (!player) return NextResponse.json({error: "No available player was found."}, {status: 409});
    const {error} = await supabase.rpc("make_live_draft_pick", {
      p_room_code: normalized, p_actor_token_hash: hostTokenHash,
      p_player: {...player, key: draftPlayerKey(player.name)},
    });
    if (error) return NextResponse.json({error: error.message}, {status: 409});
    return NextResponse.json({snapshot: await getLiveDraftSnapshot(normalized)});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : "Could not make the bot pick."}, {status: 500});
  }
}

