import fs from "node:fs";
const read=(path)=>fs.readFileSync(path,"utf8");
const checks=[
  [read("app/commissioner/recap/page.tsx").includes("CommissionerRecapEditor"),"Commissioner Recap uses the authenticated editor"],
  [read("components/CommissionerRecapEditor.tsx").includes('save("publish")'),"Recap Studio includes explicit publishing"],
  [read("app/weekly-recap/page.tsx").includes("/api/weekly-recap"),"Public recap loads the published edition"],
  [read("app/trade-war-room/page.tsx").includes("Suggested conversations"),"Trade War Room renders suggested conversations"],
  [read("app/api/trade-war-room/route.ts").includes("simulatePlayoffOdds"),"War Room uses playoff simulation output"],
  [read("lib/tradeWarRoom.ts").includes("Array.from({length:17}")&&!read("lib/tradeWarRoom.ts").includes('find((row)=>/R[1-4]/'),"War Room tracks all rounds instead of blindly selecting a premium pick"],
  [read("supabase/014_commissioner_recaps.sql").includes("unique (league_id,season,week)"),"Recap migration enforces one edition per week"],
  [read("components/AppShell.tsx").includes("/trade-war-room")&&read("components/AppShell.tsx").includes("/commissioner/recap"),"Navigation reaches both features"],
  [read("app/front-office-suite.css").includes("@media(max-width:680px)"),"New feature surfaces include a phone layout"],
];
let failed=false;for(const [ok,label] of checks){console.log(`${ok?"PASS":"FAIL"} ${label}`);if(!ok)failed=true}if(failed)process.exit(1);
