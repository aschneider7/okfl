import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const migration=readFileSync(new URL("../supabase/006_official_keepers_and_auth_draft.sql",import.meta.url),"utf8");
const integrityMigration=readFileSync(new URL("../supabase/008_keeper_integrity.sql",import.meta.url),"utf8");
const managerRoute=readFileSync(new URL("../app/api/keepers/submission/route.ts",import.meta.url),"utf8");
const commissionerRoute=readFileSync(new URL("../app/api/commissioner/keepers/route.ts",import.meta.url),"utf8");
const liveRoomRoute=readFileSync(new URL("../app/api/live-draft/rooms/route.ts",import.meta.url),"utf8");
const serverErrors=readFileSync(new URL("../lib/serverError.ts",import.meta.url),"utf8");
const commissionerPanel=readFileSync(new URL("../components/KeeperCommissionerPanel.tsx",import.meta.url),"utf8");

for(const token of ["keeper_windows","keeper_submissions","keeper_submission_events","changed_after_submission","enable row level security"]){
  assert.ok(migration.includes(token),`Keeper migration is missing ${token}`);
}
for(const token of ["keeper_eligibility","roster_verified","cost_verified","pick_verified","save_official_keeper_submission","set_official_keeper_lock","for update"]){
  assert.ok(integrityMigration.includes(token),`Keeper integrity migration is missing ${token}`);
}
assert.ok(managerRoute.includes("getAccountFromRequest")&&managerRoute.includes('action==="submit"'),"Manager submissions must be authenticated and confirmable.");
assert.ok(managerRoute.includes('rpc("save_official_keeper_submission"'),"Manager submissions must use the atomic certified-keeper RPC.");
assert.ok(commissionerRoute.includes('action==="lock"')&&commissionerRoute.includes("summary.invalid"),"Commissioner route must validate and lock the final board.");
assert.ok(commissionerRoute.includes('rpc("set_official_keeper_lock"'),"Keeper lock operations must be atomic.");
assert.ok(commissionerRoute.includes("keeperServerError")&&managerRoute.includes("keeperServerError"),"Keeper APIs must preserve structured Supabase errors.");
assert.ok(serverErrors.includes("008_keeper_integrity.sql")&&commissionerPanel.includes("Retry keeper board"),"The commissioner must receive an actionable keeper recovery state.");
assert.ok(liveRoomRoute.includes("getLockedKeeperBoard"),"The live draft must consume the final locked keeper board.");
console.log("Official keeper submission contracts validated.");
