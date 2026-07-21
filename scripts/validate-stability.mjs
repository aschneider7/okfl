import assert from "node:assert/strict";
import {existsSync,readdirSync,readFileSync} from "node:fs";
import {resolve} from "node:path";

const root=resolve(new URL("..",import.meta.url).pathname.replace(/^\/(.:)/,"$1"));
const dataProvider=readFileSync(new URL("../components/DataProvider.tsx",import.meta.url),"utf8");
const commandPalette=readFileSync(new URL("../components/CommandPalette.tsx",import.meta.url),"utf8");
const gitignore=readFileSync(new URL("../.gitignore",import.meta.url),"utf8");

assert.ok(!existsSync(resolve(root,".env.local")),".env.local must never be included in a source package.");
assert.ok(!readdirSync(root,{withFileTypes:true}).some((entry)=>entry.isDirectory()&&entry.name.startsWith("OKFL_OS_")),"A packaged OKFL project must not be nested inside the repository.");
assert.ok(!dataProvider.includes('/api/sleeper/live'),"The global data provider must not fetch Sleeper for every route.");
assert.ok(dataProvider.includes("loadData")&&commandPalette.includes("lazy:true"),"Historical data must load on demand.");
assert.ok(gitignore.includes("/OKFL_OS_*/")&&gitignore.includes("/*.zip"),"Generated release packages must be ignored.");
console.log({lazy_archive:true,nested_release:false,local_secret:false});
