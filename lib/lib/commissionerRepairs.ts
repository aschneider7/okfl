import { createAdminSupabase } from "@/lib/supabaseServer";
import { OKFL_LEAGUE_ID, SYNC_SEASON } from "@/lib/sleeperSync";

export const permanentFranchises = [
  {id:"F01",name:"Shnoods",manager:"Aaron"},
  {id:"F02",name:"Blow",manager:"Elie"},
  {id:"F03",name:"Sammy",manager:"Sammy"},
  {id:"F04",name:"Isaac",manager:"Isaac"},
  {id:"F05",name:"Jacob",manager:"Tzvi"},
  {id:"F06",name:"Usher",manager:"Usher"},
  {id:"F07",name:"Gorb",manager:"Josh + Teddy"},
  {id:"F08",name:"Haimy",manager:"Haimy"},
  {id:"F09",name:"Maurice",manager:"Maurice"},
  {id:"F10",name:"Sean",manager:"Sean"},
];

function validFranchise(franchiseId:string) {
  return permanentFranchises.some((franchise)=>franchise.id===franchiseId);
}

export async function saveUserIdentityRepair(input:{
  externalUserId:string;
  username?:string|null;
  displayName?:string|null;
  teamName?:string|null;
  franchiseId:string;
  note?:string|null;
}) {
  if (!input.externalUserId) throw new Error("Sleeper user ID is required.");
  if (!validFranchise(input.franchiseId)) throw new Error("Invalid permanent franchise.");

  const supabase=createAdminSupabase();
  const {data:before}=await supabase
    .from("sleeper_users")
    .select("*")
    .eq("league_id",OKFL_LEAGUE_ID)
    .eq("season",SYNC_SEASON)
    .eq("user_id",input.externalUserId)
    .maybeSingle();

  const now=new Date().toISOString();
  const aliasRow={
    league_id:OKFL_LEAGUE_ID,
    franchise_id:input.franchiseId,
    season:SYNC_SEASON,
    platform:"sleeper",
    external_user_id:input.externalUserId,
    username:input.username||null,
    display_name:input.displayName||null,
    team_name:input.teamName||null,
    verified:true,
    updated_at:now,
  };

  const {error:aliasError}=await supabase
    .from("identity_aliases")
    .upsert(aliasRow,{onConflict:"league_id,season,platform,external_user_id"});
  if(aliasError) throw aliasError;

  const {error:userError}=await supabase
    .from("sleeper_users")
    .update({franchise_id:input.franchiseId,updated_at:now})
    .eq("league_id",OKFL_LEAGUE_ID)
    .eq("season",SYNC_SEASON)
    .eq("user_id",input.externalUserId);
  if(userError) throw userError;

  const {error:rosterError}=await supabase
    .from("sleeper_rosters")
    .update({franchise_id:input.franchiseId,updated_at:now})
    .eq("league_id",OKFL_LEAGUE_ID)
    .eq("season",SYNC_SEASON)
    .eq("owner_id",input.externalUserId);
  if(rosterError) throw rosterError;

  const {error:auditError}=await supabase.from("commissioner_audit_log").insert({
    league_id:OKFL_LEAGUE_ID,
    season:SYNC_SEASON,
    action:"assign_identity",
    entity_type:"sleeper_user",
    entity_key:input.externalUserId,
    before_data:before,
    after_data:aliasRow,
    note:input.note||null,
  });
  if(auditError) throw auditError;

  return aliasRow;
}

export async function saveRosterIdentityRepair(input:{
  rosterId:number;
  franchiseId:string;
  note?:string|null;
}) {
  if (!Number.isInteger(input.rosterId)) throw new Error("Valid roster ID is required.");
  if (!validFranchise(input.franchiseId)) throw new Error("Invalid permanent franchise.");

  const supabase=createAdminSupabase();
  const {data:before}=await supabase
    .from("sleeper_rosters")
    .select("*")
    .eq("league_id",OKFL_LEAGUE_ID)
    .eq("season",SYNC_SEASON)
    .eq("roster_id",input.rosterId)
    .maybeSingle();

  const now=new Date().toISOString();
  const override={
    league_id:OKFL_LEAGUE_ID,
    season:SYNC_SEASON,
    roster_id:input.rosterId,
    franchise_id:input.franchiseId,
    note:input.note||null,
    updated_at:now,
  };

  const {error:overrideError}=await supabase
    .from("roster_identity_overrides")
    .upsert(override,{onConflict:"league_id,season,roster_id"});
  if(overrideError) throw overrideError;

  const {error:rosterError}=await supabase
    .from("sleeper_rosters")
    .update({franchise_id:input.franchiseId,updated_at:now})
    .eq("league_id",OKFL_LEAGUE_ID)
    .eq("season",SYNC_SEASON)
    .eq("roster_id",input.rosterId);
  if(rosterError) throw rosterError;

  const {error:matchupError}=await supabase
    .from("sleeper_matchups")
    .update({franchise_id:input.franchiseId,updated_at:now})
    .eq("league_id",OKFL_LEAGUE_ID)
    .eq("season",SYNC_SEASON)
    .eq("roster_id",input.rosterId);
  if(matchupError) throw matchupError;

  const {error:auditError}=await supabase.from("commissioner_audit_log").insert({
    league_id:OKFL_LEAGUE_ID,
    season:SYNC_SEASON,
    action:"assign_roster",
    entity_type:"sleeper_roster",
    entity_key:String(input.rosterId),
    before_data:before,
    after_data:override,
    note:input.note||null,
  });
  if(auditError) throw auditError;

  return override;
}

export async function deleteUserIdentityRepair(externalUserId:string) {
  const supabase=createAdminSupabase();
  const {data:before}=await supabase
    .from("identity_aliases")
    .select("*")
    .eq("league_id",OKFL_LEAGUE_ID)
    .eq("season",SYNC_SEASON)
    .eq("platform","sleeper")
    .eq("external_user_id",externalUserId)
    .maybeSingle();

  const {error}=await supabase
    .from("identity_aliases")
    .delete()
    .eq("league_id",OKFL_LEAGUE_ID)
    .eq("season",SYNC_SEASON)
    .eq("platform","sleeper")
    .eq("external_user_id",externalUserId);
  if(error) throw error;

  await supabase.from("commissioner_audit_log").insert({
    league_id:OKFL_LEAGUE_ID,
    season:SYNC_SEASON,
    action:"remove_identity_override",
    entity_type:"sleeper_user",
    entity_key:externalUserId,
    before_data:before,
    after_data:null,
  });
}

export async function getCommissionerRepairData() {
  const supabase=createAdminSupabase();
  const [aliases,rosters,audit]=await Promise.all([
    supabase
      .from("identity_aliases")
      .select("*")
      .eq("league_id",OKFL_LEAGUE_ID)
      .eq("season",SYNC_SEASON)
      .eq("platform","sleeper")
      .order("updated_at",{ascending:false}),
    supabase
      .from("roster_identity_overrides")
      .select("*")
      .eq("league_id",OKFL_LEAGUE_ID)
      .eq("season",SYNC_SEASON)
      .order("updated_at",{ascending:false}),
    supabase
      .from("commissioner_audit_log")
      .select("*")
      .eq("league_id",OKFL_LEAGUE_ID)
      .order("created_at",{ascending:false})
      .limit(30),
  ]);

  const error=aliases.error||rosters.error||audit.error;
  if(error) throw error;

  return {
    franchises:permanentFranchises,
    identity_aliases:aliases.data??[],
    roster_overrides:rosters.data??[],
    audit_log:audit.data??[],
  };
}
