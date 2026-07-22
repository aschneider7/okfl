import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const page=readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../app/okfl-v9.css",import.meta.url),"utf8");
const power=readFileSync(new URL("../components/PowerRankingsPreview.tsx",import.meta.url),"utf8");
const layout=readFileSync(new URL("../app/layout.tsx",import.meta.url),"utf8");

for(const token of ["home9Hero","home9Search","home9PulseGrid","home9Tools","home9Rankings","home9Activity","home9Closing"]){
  assert.ok(page.includes(token),`Home redesign is missing ${token}.`);
  assert.ok(css.includes(`.${token}`),`Home design system is missing .${token}.`);
}
for(const href of ["/account","/live-league","/playoff-odds","/trades","/mock-draft","/weekly-recap","/league-awards"]){
  assert.ok(page.includes(href),`Home page is missing the ${href} route.`);
}
assert.ok(page.includes('variant="home9"'),"Home must preserve the live power-rankings refresh.");
assert.ok(power.includes('variant?:"default"|"home9"')&&power.includes('/api/power-rankings/live'),"Power preview variant must remain live-backed.");
assert.ok(css.includes("@media(max-width:720px)")&&css.includes(".home9HeroActions{display:grid"),"Home redesign is missing its phone layout.");
assert.ok(page.includes("2QB Full PPR"),"Home must describe the league format accurately.");
assert.ok(layout.includes('/og-v4.png'),"The home redesign must use its matching social-preview artwork.");

console.log("OKFL 9.1 responsive home-page hierarchy and live data contracts validated.");
