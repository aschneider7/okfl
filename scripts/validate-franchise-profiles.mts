import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildFranchiseProfile} from "../lib/franchiseProfiles.ts";

const data=JSON.parse(readFileSync(new URL("../public/data/okfl.json",import.meta.url),"utf8"));
const profiles=data.franchises.map((franchise:any)=>buildFranchiseProfile(data,franchise.id));
const identities=profiles.map((profile:any)=>profile?.signature.label);

assert.equal(profiles.length,10,"All ten franchises must have a profile.");
assert.equal(new Set(identities).size,10,"Primary franchise identities must be distinct for the current archive.");
assert.ok(profiles.every((profile:any)=>profile?.lenses.length===4),"Every profile must include four scouting lenses.");
assert.ok(profiles.every((profile:any)=>profile?.relationships),"Every profile must include matchup relationships.");
assert.ok(identities.filter((label:string)=>label.includes("Receiver")||label.includes("Air-Raid")).length<=1,"Receiver-heavy identities must be league-relative, not a default.");

console.log({franchise_profiles:profiles.length,unique_identities:new Set(identities).size});
