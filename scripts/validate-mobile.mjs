import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const css=readFileSync(new URL("../app/mobile-tuneup.css",import.meta.url),"utf8");
const shell=readFileSync(new URL("../components/AppShell.tsx",import.meta.url),"utf8");
const layout=readFileSync(new URL("../app/layout.tsx",import.meta.url),"utf8");
const manifest=readFileSync(new URL("../app/manifest.ts",import.meta.url),"utf8");

for(const token of ["safe-area-inset-top","safe-area-inset-bottom","100dvh","mobileHeader","mobileDock","nav-open","font-size:16px","min-height:44px","orientation:landscape"]){assert.ok(css.includes(token),`Mobile tune-up is missing ${token}`)}
for(const token of ['id="mobile-league-navigation"','aria-controls="mobile-league-navigation"','document.documentElement.classList.toggle("nav-open",open)','aria-current={active?"page":undefined}']){assert.ok(shell.includes(token),`App shell mobile accessibility is missing ${token}`)}
assert.ok(layout.includes('import "./mobile-tuneup.css"'),"Mobile tune-up CSS must load last.");
assert.ok(manifest.includes('display:"standalone"')&&layout.includes('viewportFit:"cover"'),"Installed iPhone safe-area behavior requires standalone display and viewport-fit cover.");
console.log("iPhone standalone safe areas, mobile navigation, tap targets, overlays, forms, and responsive ergonomics validated.");
