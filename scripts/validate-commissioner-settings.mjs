import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const migration=readFileSync(new URL("../supabase/011_commissioner_settings.sql",import.meta.url),"utf8");
const api=readFileSync(new URL("../app/api/commissioner/settings/route.ts",import.meta.url),"utf8");
const publicApi=readFileSync(new URL("../app/api/league-settings/route.ts",import.meta.url),"utf8");
const ui=readFileSync(new URL("../components/CommissionerSettings.tsx",import.meta.url),"utf8");
const shell=readFileSync(new URL("../components/AppShell.tsx",import.meta.url),"utf8");
const rules=readFileSync(new URL("../app/rules/page.tsx",import.meta.url),"utf8");

for(const token of ["league_settings","league_rules","notice_active","rulebook_version","rulebook_managed","enable row level security"]){assert.ok(migration.includes(token),`Settings migration is missing ${token}`)}
for(const token of ["Commissioner account required","save-rule","seed-rules","delete-rule","test-push","commissioner_audit_log"]){assert.ok(api.includes(token),`Commissioner settings API is missing ${token}`)}
for(const token of ["defaultLeagueSettings","status","published"]){assert.ok(publicApi.includes(token),`Public settings API is missing ${token}`)}
for(const token of ["League Settings","Rulebook","League notice","Push activation tracker","Import current official rulebook"]){assert.ok(ui.includes(token),`Commissioner settings UI is missing ${token}`)}
assert.ok(shell.includes('label:"Commissioner"')&&shell.includes('"/commissioner/settings"')&&shell.includes("leagueNotice"),"Commissioner navigation and live notice must be wired into the shell.");
assert.ok(rules.includes("managedRules")&&rules.includes("managedRulebook")&&rules.includes("rulebookVersion"),"The public Rulebook must consume managed rules.");
console.log("Commissioner settings, managed rulebook, public notice, and push diagnostics validated.");
