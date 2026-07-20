import {NextResponse} from "next/server";
import {draftPlayerKey} from "@/lib/draftRankings";
import {keeperOverall, managers, projectedKeepers} from "@/lib/draftSimulator";
import {createDraftSecret, createRoomCode, createSeatPin, getLiveDraftSnapshot, hashDraftSecret} from "@/lib/liveDraftServer";
import {createAdminSupabase} from "@/lib/supabaseServer";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const hostName = String(body.hostName || "Commissioner").trim().slice(0, 40) || "Commissioner";
    const roomName = String(body.roomName || "2026 OKFL Live Draft").trim().slice(0, 80) || "2026 OKFL Live Draft";
    const clockSeconds = Math.max(1, Math.min(3600, Math.round(Number(body.clockSeconds) || 30)));
    const hostToken = createDraftSecret();
    const supabase = createAdminSupabase();
    let room: {id: string; code: string} | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3 && !room; attempt += 1) {
      const code = createRoomCode();
      const result = await supabase.from("live_draft_rooms").insert({
        code, name: roomName, host_name: hostName, host_token_hash: hashDraftSecret(hostToken),
        settings: {teams: 10, rounds: 17, scoring: "PPR", clockSeconds},
      }).select("id,code").single();
      if (!result.error) room = result.data;
      else lastError = result.error;
    }
    if (!room) throw lastError || new Error("Could not create a unique room code.");

    const seatPins = managers.map((manager) => ({franchiseId: manager.franchiseId, manager: manager.manager, pin: createSeatPin()}));
    const seatRows = managers.map((manager) => {
      const seat = seatPins.find((row) => row.franchiseId === manager.franchiseId)!;
      return {room_id: room!.id, franchise_id: manager.franchiseId, slot: manager.slot, manager_name: manager.manager, pin_hash: hashDraftSecret(seat.pin)};
    });
    const keeperRows = projectedKeepers.map((keeper) => {
      const manager = managers.find((row) => row.franchiseId === keeper.franchiseId)!;
      const overall = keeperOverall(keeper.round, manager.slot);
      return {
        room_id: room!.id, overall, round: keeper.round, slot: manager.slot, franchise_id: keeper.franchiseId,
        player_key: draftPlayerKey(keeper.player), keeper: true, keeper_cost: keeper.round, selected_by: "keeper",
        player: {name: keeper.player, position: keeper.position, team: "—", pprRank: 999, pprValue: 0, keeperEligible: false, source: "keeper"},
      };
    });

    const seatResult = await supabase.from("live_draft_seats").insert(seatRows);
    const keeperResult = seatResult.error ? null : await supabase.from("live_draft_picks").insert(keeperRows);
    if (seatResult.error || keeperResult?.error) {
      await supabase.from("live_draft_rooms").delete().eq("id", room.id);
      throw seatResult.error || keeperResult?.error;
    }

    const snapshot = await getLiveDraftSnapshot(room.code);
    return NextResponse.json({snapshot, hostToken, seatPins}, {status: 201});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : "Could not create the live draft room."}, {status: 500});
  }
}
