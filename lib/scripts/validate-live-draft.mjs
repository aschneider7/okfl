import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const migration = readFileSync(new URL("../supabase/003_live_draft_rooms.sql", import.meta.url), "utf8");
const requiredContracts = [
  "live_draft_rooms",
  "live_draft_seats",
  "live_draft_picks",
  "make_live_draft_pick",
  "pick_deadline",
  "p_expected_overall",
  "the pick clock has expired",
  "for update",
  "enable row level security",
  "grant execute on function public.make_live_draft_pick",
];

for (const contract of requiredContracts) {
  assert.ok(migration.toLowerCase().includes(contract), `Live Draft migration is missing: ${contract}`);
}

const roomRoute = readFileSync(new URL("../app/api/live-draft/rooms/route.ts", import.meta.url), "utf8");
const authMigration = readFileSync(new URL("../supabase/006_official_keepers_and_auth_draft.sql", import.meta.url), "utf8");
const joinRoute = readFileSync(new URL("../app/api/live-draft/rooms/[code]/join/route.ts", import.meta.url), "utf8");
assert.ok(roomRoute.includes("getLockedKeeperBoard"), "Live rooms must preload the locked official keeper board.");
assert.ok(roomRoute.includes("role!==\"commissioner\""), "Only the commissioner may create official rooms.");
assert.ok(authMigration.includes("claimed_user_id"), "Live seats must be bound to authenticated users.");
assert.ok(joinRoute.includes("account.franchiseId")&&!joinRoute.includes("body.pin"), "Seat claims must use the signed-in franchise without PINs.");

console.log("Authenticated Live Draft schema and room contracts validated.");
