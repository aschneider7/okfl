import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const migration=readFileSync(new URL("../supabase/006_official_keepers_and_auth_draft.sql",import.meta.url),"utf8");
const managerRoute=readFileSync(new URL("../app/api/keepers/submission/route.ts",import.meta.url),"utf8");
const commissionerRoute=readFileSync(new URL("../app/api/commissioner/keepers/route.ts",import.meta.url),"utf8");
const liveRoomRoute=readFileSync(new URL("../app/api/live-draft/rooms/route.ts",import.meta.url),"utf8");

for(const token of ["keeper_windows","keeper_submissions","keeper_submission_events","changed_after_submission","enable row level security"]){
  assert.ok(migration.includes(token),`Keeper migration is missing ${token}`);
}
assert.ok(managerRoute.includes("getAccountFromRequest")&&managerRoute.includes('action==="submit"'),"Manager submissions must be authenticated and confirmable.");
assert.ok(commissionerRoute.includes('action==="lock"')&&commissionerRoute.includes("summary.invalid"),"Commissioner route must validate and lock the final board.");
assert.ok(liveRoomRoute.includes("getLockedKeeperBoard"),"The live draft must consume the final locked keeper board.");
console.log("Official keeper submission contracts validated.");
