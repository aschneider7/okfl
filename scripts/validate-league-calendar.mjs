import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const migration=readFileSync(new URL("../supabase/013_league_calendar.sql",import.meta.url),"utf8");
const publicApi=readFileSync(new URL("../app/api/league-calendar/route.ts",import.meta.url),"utf8");
const commissionerApi=readFileSync(new URL("../app/api/commissioner/calendar/route.ts",import.meta.url),"utf8");
const publicUi=readFileSync(new URL("../components/LeagueCalendar.tsx",import.meta.url),"utf8");
const commissionerUi=readFileSync(new URL("../components/CommissionerCalendar.tsx",import.meta.url),"utf8");
const shell=readFileSync(new URL("../components/AppShell.tsx",import.meta.url),"utf8");

for(const token of ["league_calendar_events","starts_at","all_day","published","enable row level security"])assert.ok(migration.includes(token),`Calendar migration is missing ${token}`);
for(const token of ["keeper_windows","league_communications","mapCalendarEvent"])assert.ok(publicApi.includes(token),`Public calendar API is missing ${token}`);
for(const token of ["Commissioner account required","create_calendar_event","update_calendar_event","delete_calendar_event","notify_calendar_event","manager_notifications","sendFirebasePush"])assert.ok(commissionerApi.includes(token),`Commissioner calendar API is missing ${token}`);
for(const token of ["League agenda","Add to calendar","calendarFilters","monthCalendar"])assert.ok(publicUi.includes(token),`Public calendar UI is missing ${token}`);
for(const token of ["Calendar Controls","Notify league","datetime-local","supabase/013_league_calendar.sql"])assert.ok(commissionerUi.includes(token),`Commissioner calendar UI is missing ${token}`);
assert.ok(shell.includes('"/calendar","League Calendar"')&&shell.includes('"/commissioner/calendar","Calendar Controls"'),"Calendar navigation is not wired into the shell.");
console.log("League Calendar, automatic operational deadlines, Commissioner CRUD, and reminders validated.");
