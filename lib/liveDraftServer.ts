import {createHash, randomBytes, randomInt} from "node:crypto";
import {createAdminSupabase} from "./supabaseServer";
import type {LiveDraftPick, LiveDraftSeat, LiveDraftSnapshot} from "./liveDraft";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function hashDraftSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createDraftSecret() {
  return randomBytes(24).toString("base64url");
}

export function createRoomCode() {
  return Array.from({length: 6}, () => CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)]).join("");
}

export function autoDraftFranchises(settings:any):string[]{
  const values:string[]=Array.isArray(settings?.autoDraftFranchises)
    ? settings.autoDraftFranchises.map((value:unknown)=>String(value)).filter((value:string)=>value.length>0)
    : [];
  return [...new Set<string>(values)];
}

export function updateAutoDraftSettings(settings:any,franchiseId:string,enabled:boolean){
  const current=autoDraftFranchises(settings);
  const next=enabled?[...new Set([...current,franchiseId])]:current.filter((id)=>id!==franchiseId);
  return {...(settings&&typeof settings==="object"?settings:{}),autoDraftFranchises:next};
}

/** @deprecated Kept only so archived v7.1 source packages still type-check. */
export function createSeatPin() {
  return String(randomInt(1000,10_000));
}

export async function getLiveDraftSnapshot(code: string): Promise<LiveDraftSnapshot | null> {
  const supabase = createAdminSupabase();
  const normalized = code.trim().toUpperCase();
  const {data: room, error: roomError} = await supabase.from("live_draft_rooms").select("id,code,name,status,current_overall,host_name,settings,pick_deadline,created_at").eq("code", normalized).maybeSingle();
  if (roomError) throw roomError;
  if (!room) return null;
  const [{data: seats, error: seatsError}, {data: picks, error: picksError}] = await Promise.all([
    supabase.from("live_draft_seats").select("franchise_id,slot,manager_name,claimed_name,claimed_user_id").eq("room_id", room.id).order("slot"),
    supabase.from("live_draft_picks").select("overall,round,slot,franchise_id,player,keeper,keeper_cost,selected_by,created_at").eq("room_id", room.id).order("overall"),
  ]);
  if (seatsError) throw seatsError;
  if (picksError) throw picksError;
  const autoDraftIds=new Set(autoDraftFranchises(room.settings));
  return {
    serverTime: new Date().toISOString(),
    room: {
      id: room.id, code: room.code, name: room.name, status: room.status, currentOverall: room.current_overall,
      clockSeconds: Math.max(1, Number(room.settings?.clockSeconds) || 30), pickDeadline: room.pick_deadline,
      keeperSource: room.settings?.keeperSource==="projected"?"projected":"official",
      hostName: room.host_name, createdAt: room.created_at,
    },
    seats: (seats || []).map((seat): LiveDraftSeat => ({
      franchiseId: seat.franchise_id, slot: seat.slot, managerName: seat.manager_name,
      claimedName: seat.claimed_name, claimed: Boolean(seat.claimed_name),
      autoDraft:autoDraftIds.has(seat.franchise_id),
    })),
    picks: (picks || []).map((pick): LiveDraftPick => ({
      overall: pick.overall, round: pick.round, slot: pick.slot, franchiseId: pick.franchise_id,
      player: pick.player, keeper: pick.keeper, keeperCost: pick.keeper_cost,
      selectedBy: pick.selected_by, createdAt: pick.created_at,
    })),
  };
}
