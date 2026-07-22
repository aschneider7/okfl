import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const migration=readFileSync(new URL("../supabase/009_league_communications.sql",import.meta.url),"utf8");
const commissionerRoute=readFileSync(new URL("../app/api/commissioner/communications/route.ts",import.meta.url),"utf8");
const managerRoute=readFileSync(new URL("../app/api/league-communications/route.ts",import.meta.url),"utf8");
const commissioner=readFileSync(new URL("../components/CommissionerCommunications.tsx",import.meta.url),"utf8");
const ballot=readFileSync(new URL("../app/league-votes/page.tsx",import.meta.url),"utf8");
const sms=readFileSync(new URL("../lib/leagueCommunications.ts",import.meta.url),"utf8");
const env=readFileSync(new URL("../.env.example",import.meta.url),"utf8");

for(const token of ["league_contacts","league_communications","league_communication_recipients","league_votes","enable row level security","sms_opted_in","consent_confirmed_at"]){assert.ok(migration.includes(token),`Communications migration is missing ${token}`)}
for(const token of ["Commissioner account required","manager_notifications","sendLeagueSms","not_consented","recipientUserIds"]){assert.ok(commissionerRoute.includes(token),`Commissioner communications API is missing ${token}`)}
for(const token of ["getAccountFromRequest","communication_id,user_id","Voting is closed","optionId","eligibleCount"]){assert.ok(managerRoute.includes(token),`Manager ballot API is missing ${token}`)}
for(const token of ["Phone directory","Manager consented to SMS","League vote","Delivery & voting history"]){assert.ok(commissioner.includes(token),`Commissioner UI is missing ${token}`)}
for(const token of ["one-franchise-one-vote","Your franchise has voted","vote(","Open ballots","Final results","eligibleCount"]){assert.ok(ballot.includes(token),`League Votes UI is missing ${token}`)}
for(const token of ["TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","MessagingServiceSid","Reply STOP to opt out"]){assert.ok(sms.includes(token)||env.includes(token),`SMS delivery contract is missing ${token}`)}
assert.ok(env.includes("TWILIO_AUTH_TOKEN=replace-with"),"The example environment file must contain only a placeholder Twilio token.");
console.log("Commissioner announcements, authenticated ballots, consent registry, and optional SMS contracts validated.");
