import fs from "node:fs";

const source=fs.readFileSync(new URL("../lib/draftSimulator.ts",import.meta.url),"utf8");
const depth=JSON.parse(fs.readFileSync(new URL("../lib/draft-player-depth.json",import.meta.url),"utf8"));
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

console.log({draft_players:allNames.length,projected_keepers:keeperNames.length,live_selections:liveSelections});
