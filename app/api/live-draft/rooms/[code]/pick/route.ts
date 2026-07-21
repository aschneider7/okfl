import {NextResponse} from "next/server";
import {draftPlayerKey} from "@/lib/draftRankings";
import {getLiveDraftSnapshot, hashDraftSecret} from "@/lib/liveDraftServer";
import {createAdminSupabase} from "@/lib/supabaseServer";
import {getAccountFromRequest} from "@/lib/accountServer";
import {overallToRoundSlot} from "@/lib/draftSimulator";

const positions = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);

export async function POST(request: Request, context: {params: Promise<{code: string}>}) {
  try {
    const account=await getAccountFromRequest(request);
    if(!account||account.mustChangePassword)return NextResponse.json({error:"Authenticated franchise access required."},{status:401});
    const {code} = await context.params;
    const normalized = code.trim().toUpperCase();
    const body = await request.json();
    const expectedOverall = Number(body.expectedOverall);
    if (!Number.isInteger(expectedOverall)) return NextResponse.json({error: "The current pick number is required."}, {status: 400});
    const player = body.player || {};
    const name = String(player.name || "").trim();
    const position = String(player.position || "").toUpperCase();
    if (!name || !positions.has(position)) return NextResponse.json({error: "Choose a valid player."}, {status: 400});
    const safePlayer = {
      key: draftPlayerKey(name), name, position, team: String(player.team || "FA").slice(0, 4),
      pprRank: Number(player.pprRank) || 999, pprValue: Number(player.pprValue) || 250,
      marketAdp: Number(player.marketAdp) || undefined, age: Number(player.age) || null,
      keeperEligible: player.keeperEligible !== false, source: String(player.source || "live-draft"),
    };
    const supabase = createAdminSupabase();
    const {data:room}=await supabase.from("live_draft_rooms").select("id,current_overall").eq("code",normalized).maybeSingle();
    if(!room)return NextResponse.json({error:"Draft room not found."},{status:404});
    const current=overallToRoundSlot(room.current_overall);
    const {data:seat}=await supabase.from("live_draft_seats").select("franchise_id,claimed_user_id").eq("room_id",room.id).eq("slot",current.slot).maybeSingle();
    if(!seat||seat.franchise_id!==account.franchiseId||seat.claimed_user_id!==account.userId)return NextResponse.json({error:"Your authenticated franchise is not on the clock."},{status:403});
    const {error} = await supabase.rpc("make_live_draft_pick", {
      p_room_code: normalized, p_actor_token_hash: hashDraftSecret(String(body.actorToken || "")), p_player: safePlayer,
      p_expected_overall: expectedOverall,
    });
    if (error) return NextResponse.json({error: error.message}, {status: 409});
    return NextResponse.json({snapshot: await getLiveDraftSnapshot(normalized)});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : "Could not submit the pick."}, {status: 500});
  }
}
