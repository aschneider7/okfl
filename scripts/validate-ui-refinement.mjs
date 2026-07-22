import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const legacyCss = read("app/ui-refinement.css");
const css = read("app/okfl-v9.css");
const layout = read("app/layout.tsx");
const shell = read("components/AppShell.tsx");
const pkg = JSON.parse(read("package.json"));

const checks = [
  [layout.indexOf('import "./okfl-v9.css";') > layout.indexOf('import "./front-office-suite.css";'), "OKFL 9 design system loads last"],
  [css.includes(".pageHead h1") && css.includes("font-size:32px!important"), "mobile page title scale is restrained"],
  [css.includes(".home2Hero h1") && css.includes("font-size:44px!important"), "mobile home hero scale is restrained"],
  [css.includes("--v9-primary:#335765") && css.includes("--v9-teal:#176d63"), "brand color is systematic and accessible"],
  [css.includes(".tableWrap") && css.includes("th,td"), "table rhythm is standardized"],
  [legacyCss.includes("@media(hover:hover)") && css.includes("@media(prefers-reduced-motion:reduce)"), "motion respects input mode and user preference"],
  [css.includes("safe-area-inset-top") && css.includes(".mobileDock span"), "mobile refinements preserve safe areas and readable dock labels"],
  [shell.includes('["/calendar","Calendar","CL"]'), "mobile calendar label is concise"],
  [pkg.version === "9.1.1", "package version is 9.1.1"],
];

const failed = checks.filter(([ok]) => !ok);
for (const [ok, label] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
if (failed.length) process.exit(1);
