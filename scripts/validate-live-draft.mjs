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
assert.ok(roomRoute.includes("projectedKeepers"), "Live rooms must preload official keepers.");
assert.ok(roomRoute.includes("createSeatPin"), "Live rooms must provision private team PINs.");

console.log("Live Draft schema and room contracts validated.");
