import assert from "node:assert/strict";
import {existsSync,readdirSync,readFileSync} from "node:fs";
import {resolve} from "node:path";

const root=resolve(new URL("..",import.meta.url).pathname.replace(/^\/(.:)/,"$1"));
const dataProvider=readFileSync(new URL("../components/DataProvider.tsx",import.meta.url),"utf8");
const commandPalette=readFileSync(new URL("../components/CommandPalette.tsx",import.meta.url),"utf8");
const rootLayout=readFileSync(new URL("../app/layout.tsx",import.meta.url),"utf8");
const gitignore=readFileSync(new URL("../.gitignore",import.meta.url),"utf8");
const packageLock=readFileSync(new URL("../package-lock.json",import.meta.url),"utf8");
const workflow=readFileSync(new URL("../.github/workflows/ci.yml",import.meta.url),"utf8");

assert.ok(!existsSync(resolve(root,".env.local")),".env.local must never be included in a source package.");
assert.ok(!readdirSync(root,{withFileTypes:true}).some((entry)=>entry.isDirectory()&&entry.name.startsWith("OKFL_OS_")),"A packaged OKFL project must not be nested inside the repository.");
assert.ok(!dataProvider.includes('/api/sleeper/live'),"The global data provider must not fetch Sleeper for every route.");
assert.ok(dataProvider.includes("loadData")&&commandPalette.includes("lazy:true"),"Historical data must load on demand.");
assert.ok(gitignore.includes("/OKFL_OS_*/")&&gitignore.includes("/*.zip"),"Generated release packages must be ignored.");
assert.ok(!packageLock.includes("packages.applied-caas-gateway")&&packageLock.includes("registry.npmjs.org"),"The npm lockfile must use the public npm registry.");
assert.ok(workflow.includes("npm ci")&&workflow.includes("npm run validate")&&workflow.includes("npm run build:ci"),"GitHub CI must install, validate, and build every change.");
assert.ok(!existsSync(resolve(root,"components","SearchEngine3.tsx")),"The retired search implementation must not return.");
assert.ok(rootLayout.includes("/og-v3.png")&&!rootLayout.includes('url: "/og.png"')&&!rootLayout.includes('url: "/og-v2.png"'),"Metadata must use the current social preview asset.");
console.log({lazy_archive:true,nested_release:false,local_secret:false,public_registry:true,github_ci:true,dead_assets:false});
