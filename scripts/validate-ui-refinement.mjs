import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("app/ui-refinement.css");
const layout = read("app/layout.tsx");
const shell = read("components/AppShell.tsx");
const pkg = JSON.parse(read("package.json"));

const checks = [
  [layout.indexOf('import "./ui-refinement.css";') > layout.indexOf('import "./mobile-tuneup.css";'), "UI refinement CSS loads last"],
  [css.includes(".pageHead h1") && css.includes("clamp(32px,10.7vw,43px)"), "mobile page title scale is restrained"],
  [css.includes(".home2Hero h1") && css.includes("clamp(40px,12.5vw,50px)"), "mobile home hero scale is restrained"],
  [css.includes("background:var(--surface)!important") && css.includes("border-top:5px solid var(--signal)"), "home tool cards use color as an accent"],
  [css.includes(".tableWrap th") && css.includes(".tableWrap td"), "table rhythm is standardized"],
  [css.includes("@media(hover:hover)") && css.includes("@media(prefers-reduced-motion:reduce)"), "motion respects input mode and user preference"],
  [css.includes("var(--okfl-safe-left)") && css.includes(".mobileDock a span"), "mobile refinements preserve safe areas and readable dock labels"],
  [shell.includes('label === "League Calendar" ? "Calendar"'), "mobile calendar label is concise"],
  [pkg.version === "8.7.0", "package version is 8.7.0"],
];

const failed = checks.filter(([ok]) => !ok);
for (const [ok, label] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
if (failed.length) process.exit(1);
