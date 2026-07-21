import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const migration=readFileSync(new URL("../supabase/007_manager_franchise_hub.sql",import.meta.url),"utf8");
const route=readFileSync(new URL("../app/api/account/franchise-dashboard/route.ts",import.meta.url),"utf8");
const page=readFileSync(new URL("../app/account/page.tsx",import.meta.url),"utf8");
const builder=readFileSync(new URL("../lib/myFranchise.ts",import.meta.url),"utf8");

for(const token of ["manager_profiles","manager_notifications","manager_activity","enable row level security"]){assert.ok(migration.includes(token),`Manager Hub migration is missing ${token}`)}
for(const token of ["getAccountFromRequest","readSleeperSnapshot","buildMyFranchiseDashboard","Cache-Control"]){assert.ok(route.includes(token),`Manager Hub API is missing ${token}`)}
for(const token of ["Upcoming matchup","Your playoff path","Trade needs","Awards & rankings","Trophy case","Primary rivalries","Personal activity"]){assert.ok(page.includes(token),`My Franchise page is missing ${token}`)}
for(const token of ["simulatePlayoffOdds","buildAwardsRace","keeperRecommendations","rivalries","badges"]){assert.ok(builder.includes(token),`My Franchise intelligence is missing ${token}`)}
console.log("My Franchise profile, inbox, and intelligence contracts validated.");
