import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const css=readFileSync(new URL("../app/okfl-v9.css",import.meta.url),"utf8");
const colors={
  white:"#ffffff",
  surface:"#ffffff",
  primary:"#335765",
  primaryDark:"#24434f",
  primarySoft:"#e8f0f2",
  ink:"#152329",
  inkSoft:"#354b54",
  muted:"#5c6f77",
  night:"#142d36",
  darkAccent:"#a7d9d1",
  teal:"#176d63",
};

const channel=(value)=>{
  const normalized=value/255;
  return normalized<=0.04045?normalized/12.92:((normalized+0.055)/1.055)**2.4;
};
const luminance=(hex)=>{
  const raw=hex.slice(1);
  const values=[0,2,4].map((index)=>Number.parseInt(raw.slice(index,index+2),16));
  return 0.2126*channel(values[0])+0.7152*channel(values[1])+0.0722*channel(values[2]);
};
const contrast=(foreground,background)=>{
  const values=[luminance(foreground),luminance(background)].sort((a,b)=>b-a);
  return (values[0]+0.05)/(values[1]+0.05);
};

const pairs=[
  ["primary text on white",colors.primary,colors.white,4.5],
  ["white text on primary",colors.white,colors.primary,4.5],
  ["white text on primary dark",colors.white,colors.primaryDark,4.5],
  ["primary text on primary soft",colors.primary,colors.primarySoft,4.5],
  ["body ink on surface",colors.ink,colors.surface,7],
  ["secondary ink on surface",colors.inkSoft,colors.surface,4.5],
  ["muted text on surface",colors.muted,colors.surface,4.5],
  ["white text on navigation",colors.white,colors.night,7],
  ["pale accent on navigation",colors.darkAccent,colors.night,4.5],
  ["teal text on surface",colors.teal,colors.surface,4.5],
];

assert.ok(css.includes("--v9-primary:#335765"),"The requested #335765 main color is missing.");
assert.ok(css.includes("--editorial:var(--v9-primary)"),"Legacy themes must inherit the main color.");
assert.ok(css.includes(".routeStage .intelHero>div:last-child b{color:var(--v9-primary)!important}"),"Intelligence hero metric text must remain readable on its light card.");
assert.ok(css.includes(".routeStage .identityLeaders a>b{color:#fff!important}"),"Identity leader names must remain readable on the dark panel.");
for(const [label,foreground,background,minimum] of pairs){
  const ratio=contrast(foreground,background);
  assert.ok(ratio>=minimum,`${label} is ${ratio.toFixed(2)}:1; expected at least ${minimum}:1.`);
  console.log(`${label}: ${ratio.toFixed(2)}:1`);
}

console.log("OKFL color-system contrast contracts validated.");
