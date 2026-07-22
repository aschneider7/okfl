import {createAdminSupabase} from "@/lib/supabaseServer";

export const KEEPER_SEASON = 2026;
export const KEEPERS_PER_TEAM = 3;
export const KEEPER_POSITIONS = ["QB","RB","WR","TE","K","DEF"] as const;

export type KeeperChoice = {
  player: string;
  position: string;
  round: number;
};

export type KeeperIssue = {
  code: "count"|"player"|"position"|"round"|"duplicate-player"|"duplicate-round"|"uncertified";
  message: string;
};

export type KeeperEligibility={franchise_id:string;player:string;player_key:string;position:string;round:number;roster_verified:boolean;cost_verified:boolean;pick_verified:boolean;eligible:boolean;note?:string|null};
export const keeperPlayerKey=(value:string)=>String(value||"").toLowerCase().replace(/[^a-z0-9]+/g,"");

export function normalizeKeeperChoices(value: unknown): KeeperChoice[] {
  if(!Array.isArray(value)) return [];
  return value.slice(0,KEEPERS_PER_TEAM).map((row:any)=>({
    player:String(row?.player||"").trim().slice(0,80),
    position:String(row?.position||"").trim().toUpperCase().slice(0,3),
    round:Math.round(Number(row?.round)||0),
  }));
}

export function validateKeeperChoices(choices: KeeperChoice[], requireComplete=true): KeeperIssue[] {
  const issues:KeeperIssue[]=[];
  const filled=choices.filter((choice)=>choice.player||choice.position||choice.round);
  if(requireComplete&&filled.length!==KEEPERS_PER_TEAM) issues.push({code:"count",message:`Select exactly ${KEEPERS_PER_TEAM} keepers.`});
  filled.forEach((choice,index)=>{
    if(!choice.player) issues.push({code:"player",message:`Keeper ${index+1} needs a player.`});
    if(!KEEPER_POSITIONS.includes(choice.position as any)) issues.push({code:"position",message:`Keeper ${index+1} needs a valid position.`});
    if(!Number.isInteger(choice.round)||choice.round<1||choice.round>17) issues.push({code:"round",message:`Keeper ${index+1} needs a Round 1–17 cost.`});
  });
  const players=filled.filter((choice)=>choice.player).map((choice)=>choice.player.toLowerCase());
  if(new Set(players).size!==players.length) issues.push({code:"duplicate-player",message:"A player can only be submitted once."});
  const rounds=filled.filter((choice)=>choice.round>=1&&choice.round<=17).map((choice)=>choice.round);
  if(new Set(rounds).size!==rounds.length) issues.push({code:"duplicate-round",message:"Two keepers cannot use the same round cost."});
  return issues;
}

export function crossTeamKeeperIssues(rows:{franchise_id:string;choices:unknown}[]) {
  const byPlayer=new Map<string,string[]>();
  rows.forEach((row)=>normalizeKeeperChoices(row.choices).forEach((choice)=>{
    if(!choice.player)return;
    const key=choice.player.toLowerCase();
    byPlayer.set(key,[...(byPlayer.get(key)||[]),row.franchise_id]);
  }));
  const issues=new Map<string,KeeperIssue[]>();
  for(const [player,franchises] of byPlayer){
    if(franchises.length<2)continue;
    franchises.forEach((franchiseId)=>issues.set(franchiseId,[...(issues.get(franchiseId)||[]),{code:"duplicate-player",message:`${player} is also submitted by another franchise.`}]));
  }
  return issues;
}

export function certifiedKeeperIssues(franchiseId:string,choices:KeeperChoice[],eligibility:KeeperEligibility[]){
  return choices.filter((choice)=>choice.player).flatMap((choice):KeeperIssue[]=>{
    const certified=eligibility.find((row)=>row.franchise_id===franchiseId&&row.player_key===keeperPlayerKey(choice.player)&&row.position===choice.position&&Number(row.round)===choice.round&&row.eligible&&row.roster_verified&&row.cost_verified&&row.pick_verified);
    return certified?[]:[{code:"uncertified",message:`${choice.player} is not certified for this franchise at Round ${choice.round}.`}];
  });
}

export async function getLockedKeeperBoard(season=KEEPER_SEASON):Promise<(KeeperChoice&{franchiseId:string})[]|null>{
  const supabase=createAdminSupabase();
  const {data:window,error:windowError}=await supabase.from("keeper_windows").select("status").eq("season",season).maybeSingle();
  if(windowError)throw windowError;
  if(window?.status!=="locked")return null;
  const {data,error}=await supabase.from("keeper_submissions").select("franchise_id,choices,status").eq("season",season).eq("status","locked");
  if(error)throw error;
  if((data||[]).length!==10)return null;
  const board=(data||[]).flatMap((row)=>normalizeKeeperChoices(row.choices).map((choice)=>({...choice,franchiseId:row.franchise_id})));
  return board.length===10*KEEPERS_PER_TEAM?board:null;
}
