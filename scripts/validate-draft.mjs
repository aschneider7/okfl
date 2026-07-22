import fs from "node:fs";

const source=fs.readFileSync(new URL("../lib/draftSimulator.ts",import.meta.url),"utf8");
const historySource=fs.readFileSync(new URL("../lib/draftHistory.ts",import.meta.url),"utf8");
const draftCss=fs.readFileSync(new URL("../app/mock-draft/styles/sleek-overhaul.css",import.meta.url),"utf8");
const readabilityCss=fs.readFileSync(new URL("../app/mock-draft/styles/readability-overhaul.css",import.meta.url),"utf8");
const draftPageSource=fs.readFileSync(new URL("../app/mock-draft/page.tsx",import.meta.url),"utf8");
const boardCellSource=fs.readFileSync(new URL("../app/mock-draft/components/BoardCell.tsx",import.meta.url),"utf8");
const boardSource=fs.readFileSync(new URL("../app/mock-draft/components/DraftBoard.tsx",import.meta.url),"utf8");
const reportSource=fs.readFileSync(new URL("../app/mock-draft/components/DraftReport.tsx",import.meta.url),"utf8");
const depth=JSON.parse(fs.readFileSync(new URL("../lib/draft-player-depth.json",import.meta.url),"utf8"));
const archive=JSON.parse(fs.readFileSync(new URL("../public/data/okfl.json",import.meta.url),"utf8"));
const baseNames=[...source.matchAll(/\["([^"]+)","(?:QB|RB|WR|TE|K|DEF)"/g)].map((match)=>match[1]);
const keeperNames=[...source.matchAll(/player:"([^"]+)"/g)].map((match)=>match[1]);
const allNames=[...baseNames,...depth.map((player)=>player.name)];
const normalized=allNames.map((name)=>name.trim().toLowerCase());
const allowedPositions=new Set(["QB","RB","WR","TE","K","DEF"]);
const liveSelections=17*10-keeperNames.length;

function assert(condition,message){
  if(!condition)throw new Error(`Draft validation failed: ${message}`);
}

assert(baseNames.length>=90,`expected at least 90 ranked players, found ${baseNames.length}`);
assert(depth.length>=150,`expected at least 150 depth players, found ${depth.length}`);
assert(new Set(normalized).size===normalized.length,"player pool contains duplicate exact names");
assert(depth.every((player)=>player.name&&allowedPositions.has(player.position)&&player.team),"depth rows require name, supported position, and team");
assert(depth.filter((player)=>player.position==="K").length>=10,"pool needs at least 10 kickers");
assert(depth.filter((player)=>player.position==="DEF").length>=10,"pool needs at least 10 defenses");
assert(allNames.length-keeperNames.filter((name)=>normalized.includes(name.toLowerCase())).length>=liveSelections,
  `pool cannot fill ${liveSelections} live selections after keeper locks`);

const snakeSlot=(round,pickInRound)=>round%2===1?pickInRound:11-pickInRound;
const keeperOverall=(round,slot)=>(round-1)*10+(round%2===1?slot:11-slot);
assert(snakeSlot(1,1)===1&&snakeSlot(2,1)===10&&snakeSlot(2,10)===1,"snake slot mapping is invalid");
assert(keeperOverall(1,1)===1&&keeperOverall(2,10)===11&&keeperOverall(2,1)===20,"keeper slot mapping is invalid");

const projectedQbKeepers=[...source.matchAll(/\{franchiseId:"[^"]+",player:"([^"]+)",round:\d+,position:"QB"\}/g)].map((match)=>match[1]);
const tierSamples=[...historySource.matchAll(/samples:(\d+)/g)].map((match)=>Number(match[1]));
assert(historySource.includes("OKFL_QB_MARKET_TIERS"),"draft model must expose historical PPR market tiers");
assert(tierSamples.reduce((sum,count)=>sum+count,0)===83,"historical market model must retain all 83 valid observations");
assert(historySource.includes(`CURRENT_PROJECTED_QB_KEEPERS = ["${projectedQbKeepers.join('\",\"')}"]`),"historical curve exclusions must match the current projected QB keepers");
assert(!historySource.toLowerCase().includes("dakprescott")&&!historySource.toLowerCase().includes("lamarjackson"),"the market model cannot contain player-specific QB anchors");
assert(!source.includes("Math.min(20"),"the simulator cannot contain an individual late-second QB cap");
assert(source.includes("applyOkflHistoricalQuarterbackCurve"),"simulator must apply the historical quarterback curve");
assert(draftCss.includes("-webkit-line-clamp: 2")&&draftCss.includes("white-space: normal"),"draft player names must support two readable lines");
assert(draftPageSource.indexOf('import "./styles/readability-overhaul.css"')>draftPageSource.indexOf('import "./styles/draft-room.css"'),"readability overrides must load after every draft stylesheet");
assert(boardCellSource.includes("pickGradeBadge")&&boardCellSource.includes("gradeTone(pick.grade)"),"board grades need large semantic badges");
assert(boardSource.includes("gradeLegend")&&boardSource.includes("Major reach"),"the draft board needs a visible grade legend");
assert(reportSource.includes("gradeTone(report.grade)"),"final grades must reuse the board grade language");
assert(readabilityCss.includes("font-size: 9px")&&readabilityCss.includes("grid-auto-rows: 76px")&&readabilityCss.includes("order: -1"),"draft readability sizing and mobile decision order are required");

console.log({draft_players:allNames.length,projected_keepers:keeperNames.length,live_selections:liveSelections,qb_market_samples:tierSamples.reduce((sum,count)=>sum+count,0)});
