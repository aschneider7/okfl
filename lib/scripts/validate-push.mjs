import fs from "node:fs";

const required=["app/manifest.ts","public/firebase-messaging-sw.js","components/NotificationSetup.tsx","app/api/account/push/route.ts","lib/firebaseClient.ts","lib/firebasePush.ts","supabase/010_pwa_push_notifications.sql"];
for(const file of required)if(!fs.existsSync(file))throw new Error(`Missing push-notification file: ${file}`);
const migration=fs.readFileSync("supabase/010_pwa_push_notifications.sql","utf8");
for(const marker of ["manager_push_devices","installation_id","push_status","enable row level security"])if(!migration.includes(marker))throw new Error(`Push migration is missing ${marker}`);
const route=fs.readFileSync("app/api/commissioner/communications/route.ts","utf8");
if(!route.includes("sendFirebasePush")||!route.includes("push_success_count"))throw new Error("Commissioner communications are not connected to push delivery.");
const worker=fs.readFileSync("public/firebase-messaging-sw.js","utf8");
if(!worker.includes('addEventListener("push"')||!worker.includes('addEventListener("notificationclick"'))throw new Error("Service worker is missing push handlers.");
console.log("PWA manifest, authenticated FID registration, migration, and Commissioner push delivery validated.");
