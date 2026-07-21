import { createAdminSupabase } from "@/lib/supabaseServer";
import {saveLivePowerSnapshot} from "@/lib/livePowerStore";

export const SLEEPER_LEAGUE_ID = "1381102523590389760";
export const OKFL_LEAGUE_ID = "okfl";
export const SYNC_SEASON = 2026;
const API = "https://api.sleeper.app/v1";

const identityAliases: Record<string, string> = {
  chickenshnoodle: "F01", shnoods: "F01", aaron: "F01",
  elieoj: "F02", elie: "F02", blow: "F02",
  sammyreghini: "F03", sammy: "F03",
  imikhli414: "F04", isaac: "F04",
  jmikhli: "F05", jacob: "F05", tzvi: "F05", jickli: "F05",
  woodjablowme: "F06", fucknickchubb: "F06", usher: "F06",
  joshgorb: "F07", gorb: "F07", josh: "F07", teddy: "F07",
  haimyboolbool: "F08", nathansiddd: "F08", haimy: "F08", nathan: "F08",
  mauriceb: "F09", maurice: "F09", teddylozieh: "F09",
  sean69420: "F10", sean: "F10",
};

const franchiseNames: Record<string,string> = {
  F01:"Shnoods",F02:"Blow",F03:"Sammy",F04:"Isaac",F05:"Jacob",
  F06:"Usher",F07:"Gorb",F08:"Haimy",F09:"Maurice",F10:"Sean"
};

const franchiseManagers: Record<string,{current:string;original:string}> = {
  F01:{current:"Aaron",original:"Aaron"},
  F02:{current:"Elie",original:"Elie"},
  F03:{current:"Sammy",original:"Sammy"},
  F04:{current:"Isaac",original:"Isaac"},
  F05:{current:"Tzvi",original:"Jacob"},
  F06:{current:"Usher",original:"Usher"},
  F07:{current:"Josh + Teddy",original:"Josh"},
  F08:{current:"Haimy",original:"Nathan"},
  F09:{current:"Maurice",original:"Teddy"},
  F10:{current:"Sean",original:"Sean"},
};

function norm(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function sleeper<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Sleeper ${path} returned ${response.status}`);
  return response.json() as Promise<T>;
}

async function loadCommissionerOverrides() {
  const supabase=createAdminSupabase();
  const [aliasesResult,rostersResult]=await Promise.all([
    supabase
      .from("identity_aliases")
      .select("external_user_id,username,display_name,team_name,franchise_id")
      .eq("league_id",OKFL_LEAGUE_ID)
      .eq("season",SYNC_SEASON)
      .eq("platform","sleeper")
      .eq("verified",true),
    supabase
      .from("roster_identity_overrides")
      .select("roster_id,franchise_id")
      .eq("league_id",OKFL_LEAGUE_ID)
      .eq("season",SYNC_SEASON),
  ]);
  if(aliasesResult.error) throw aliasesResult.error;
  if(rostersResult.error) throw rostersResult.error;

  const userById:Record<string,string>={};
  const aliasMap:Record<string,string>={};
  for(const row of aliasesResult.data??[]) {
    if(row.external_user_id) userById[row.external_user_id]=row.franchise_id;
    for(const value of [row.username,row.display_name,row.team_name]) {
      if(value) aliasMap[norm(value)]=row.franchise_id;
    }
  }
  const rosterMap:Record<string,string>={};
  for(const row of rostersResult.data??[]) {
    rosterMap[String(row.roster_id)]=row.franchise_id;
  }
  return {userById,aliasMap,rosterMap};
}

function mapUsers(users: any[], saved:{userById:Record<string,string>;aliasMap:Record<string,string>}) {
  const userToFranchise: Record<string,string> = {};
  const unresolved: any[] = [];
  const mappedUsers = users.map((user) => {
    const candidates = [user.username, user.display_name, user.metadata?.team_name];
    const franchiseId =
      saved.userById[user.user_id] ??
      candidates.map(norm).map((value) => saved.aliasMap[value] ?? identityAliases[value]).find(Boolean) ??
      null;
    if (franchiseId) userToFranchise[user.user_id] = franchiseId;
    else unresolved.push({
      user_id:user.user_id,
      username:user.username,
      display_name:user.display_name,
      team_name:user.metadata?.team_name ?? null
    });
    return {
      ...user,
      franchise_id: franchiseId,
      franchise: franchiseId ? franchiseNames[franchiseId] : null
    };
  });
  return { mappedUsers, userToFranchise, unresolved };
}

function buildRosterMap(rosters: any[], userToFranchise: Record<string,string>, savedRosterMap:Record<string,string>) {
  const rosterToFranchise: Record<string,string> = {};
  const unresolved: any[] = [];
  const mappedRosters = rosters.map((roster) => {
    const franchiseId = savedRosterMap[String(roster.roster_id)] ?? userToFranchise[roster.owner_id] ?? null;
    if (franchiseId) rosterToFranchise[String(roster.roster_id)] = franchiseId;
    else unresolved.push({ roster_id:roster.roster_id, owner_id:roster.owner_id });
    return {
      ...roster,
      franchise_id:franchiseId,
      franchise:franchiseId ? franchiseNames[franchiseId] : null
    };
  });
  return { mappedRosters, rosterToFranchise, unresolved };
}

function mapTransactions(weeks: any[][], rosterToFranchise: Record<string,string>) {
  const mapped: any[] = [];
  const mappedTrades: any[] = [];
  weeks.flat().forEach((tx) => {
    const adds = Object.entries(tx.adds ?? {}).map(([player_id, roster_id]) => ({
      player_id,
      roster_id,
      franchise_id:rosterToFranchise[String(roster_id)] ?? null
    }));
    const drops = Object.entries(tx.drops ?? {}).map(([player_id, roster_id]) => ({
      player_id,
      roster_id,
      franchise_id:rosterToFranchise[String(roster_id)] ?? null
    }));
    const record = { ...tx, adds, drops };
    mapped.push(record);

    if (tx.type === "trade" && tx.status === "complete") {
      const sides: Record<string,{
        franchise_id:string;
        franchise:string;
        players_received:string[];
        players_sent:string[];
      }> = {};
      for (const add of adds) {
        if (!add.franchise_id) continue;
        sides[add.franchise_id] ??= {
          franchise_id:add.franchise_id,
          franchise:franchiseNames[add.franchise_id],
          players_received:[],
          players_sent:[]
        };
        sides[add.franchise_id].players_received.push(add.player_id);
      }
      for (const drop of drops) {
        if (!drop.franchise_id) continue;
        sides[drop.franchise_id] ??= {
          franchise_id:drop.franchise_id,
          franchise:franchiseNames[drop.franchise_id],
          players_received:[],
          players_sent:[]
        };
        sides[drop.franchise_id].players_sent.push(drop.player_id);
      }
      mappedTrades.push({
        transaction_id:tx.transaction_id,
        status:tx.status,
        week:tx.leg ?? tx.week ?? null,
        created:tx.created,
        draft_picks:tx.draft_picks ?? [],
        waiver_budget:tx.waiver_budget ?? [],
        sides:Object.values(sides)
      });
    }
  });
  return { mapped, mappedTrades };
}

function mapMatchups(weeks: any[][], rosterToFranchise: Record<string,string>) {
  return weeks.flatMap((rows, index) =>
    rows.map((row) => ({
      ...row,
      week:index+1,
      franchise_id:rosterToFranchise[String(row.roster_id)] ?? null,
      franchise:franchiseNames[rosterToFranchise[String(row.roster_id)]] ?? null
    }))
  );
}

async function seedLeagueAndFranchises() {
  const supabase = createAdminSupabase();
  const { error: leagueError } = await supabase.from("leagues").upsert({
    id:OKFL_LEAGUE_ID,
    name:"Obama Keeper Fantasy League",
    platform:"sleeper",
    current_season:SYNC_SEASON,
    updated_at:new Date().toISOString()
  }, { onConflict:"id" });
  if (leagueError) throw leagueError;

  const rows = Object.entries(franchiseNames).map(([id,name]) => ({
    id,
    league_id:OKFL_LEAGUE_ID,
    name,
    current_manager:franchiseManagers[id].current,
    original_manager:franchiseManagers[id].original,
    updated_at:new Date().toISOString()
  }));
  const { error } = await supabase.from("franchises").upsert(rows, { onConflict:"id" });
  if (error) throw error;
}

async function saveSnapshot(snapshot: any, runId: string) {
  const supabase = createAdminSupabase();
  const now = new Date().toISOString();

  const userRows = snapshot.users.map((user:any) => ({
    league_id:OKFL_LEAGUE_ID,
    season:SYNC_SEASON,
    user_id:user.user_id,
    franchise_id:user.franchise_id,
    username:user.username,
    display_name:user.display_name,
    team_name:user.metadata?.team_name ?? null,
    avatar:user.avatar ?? null,
    raw:user,
    updated_at:now
  }));

  const rosterRows = snapshot.rosters.map((roster:any) => ({
    league_id:OKFL_LEAGUE_ID,
    season:SYNC_SEASON,
    roster_id:roster.roster_id,
    owner_id:roster.owner_id,
    franchise_id:roster.franchise_id,
    players:roster.players ?? [],
    starters:roster.starters ?? [],
    reserve:roster.reserve ?? [],
    taxi:roster.taxi ?? [],
    settings:roster.settings ?? {},
    metadata:roster.metadata ?? {},
    raw:roster,
    updated_at:now
  }));

  const transactionRows = snapshot.transactions.map((tx:any) => ({
    league_id:OKFL_LEAGUE_ID,
    season:SYNC_SEASON,
    transaction_id:tx.transaction_id,
    week:tx.leg ?? tx.week ?? null,
    type:tx.type,
    status:tx.status,
    created_at_ms:tx.created ?? null,
    roster_ids:tx.roster_ids ?? [],
    adds:tx.adds ?? [],
    drops:tx.drops ?? [],
    draft_picks:tx.draft_picks ?? [],
    waiver_budget:tx.waiver_budget ?? [],
    raw:tx,
    updated_at:now
  }));

  const tradeRows = snapshot.trades.map((trade:any) => ({
    league_id:OKFL_LEAGUE_ID,
    season:SYNC_SEASON,
    transaction_id:trade.transaction_id,
    week:trade.week,
    created_at_ms:trade.created,
    sides:trade.sides,
    draft_picks:trade.draft_picks ?? [],
    waiver_budget:trade.waiver_budget ?? [],
    updated_at:now
  }));

  const matchupRows = snapshot.matchups.map((row:any) => ({
    league_id:OKFL_LEAGUE_ID,
    season:SYNC_SEASON,
    week:row.week,
    roster_id:row.roster_id,
    matchup_id:row.matchup_id ?? null,
    franchise_id:row.franchise_id,
    points:Number(row.points ?? 0),
    starters:row.starters ?? [],
    starters_points:row.starters_points ?? [],
    players:row.players ?? [],
    players_points:row.players_points ?? {},
    custom_points:row.custom_points ?? null,
    raw:row,
    updated_at:now
  }));

  const tradedPickRows = snapshot.traded_picks.map((pick:any,index:number) => ({
    league_id:OKFL_LEAGUE_ID,
    season:SYNC_SEASON,
    pick_key:`${pick.season ?? SYNC_SEASON}-${pick.round ?? 0}-${pick.roster_id ?? 0}-${pick.owner_id ?? 0}-${index}`,
    round:pick.round ?? null,
    roster_id:pick.roster_id ?? null,
    previous_owner_id:pick.previous_owner_id ?? null,
    owner_id:pick.owner_id ?? null,
    raw:pick,
    updated_at:now
  }));

  const draftRows = snapshot.drafts.map((draft:any) => ({
    league_id:OKFL_LEAGUE_ID,
    season:SYNC_SEASON,
    draft_id:draft.draft_id,
    status:draft.status ?? null,
    type:draft.type ?? null,
    start_time:draft.start_time ?? null,
    settings:draft.settings ?? {},
    metadata:draft.metadata ?? {},
    raw:draft,
    updated_at:now
  }));

  const bracketRows = [
    ...snapshot.winners_bracket.map((row:any,index:number) => ({
      league_id:OKFL_LEAGUE_ID,
      season:SYNC_SEASON,
      bracket_type:"winners",
      row_id:String(row.m ?? index),
      row_data:row,
      updated_at:now
    })),
    ...snapshot.losers_bracket.map((row:any,index:number) => ({
      league_id:OKFL_LEAGUE_ID,
      season:SYNC_SEASON,
      bracket_type:"losers",
      row_id:String(row.m ?? index),
      row_data:row,
      updated_at:now
    }))
  ];

  const batches: Array<[string, any[], string]> = [
    ["sleeper_users", userRows, "league_id,season,user_id"],
    ["sleeper_rosters", rosterRows, "league_id,season,roster_id"],
    ["sleeper_transactions", transactionRows, "league_id,season,transaction_id"],
    ["sleeper_trades", tradeRows, "league_id,season,transaction_id"],
    ["sleeper_matchups", matchupRows, "league_id,season,week,roster_id"],
    ["sleeper_traded_picks", tradedPickRows, "league_id,season,pick_key"],
    ["sleeper_drafts", draftRows, "league_id,season,draft_id"],
    ["sleeper_brackets", bracketRows, "league_id,season,bracket_type,row_id"]
  ];

  for (const [table, rows, conflict] of batches) {
    if (!rows.length) continue;
    const { error } = await supabase.from(table).upsert(rows, { onConflict:conflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }

  const counts = {
    users:userRows.length,
    rosters:rosterRows.length,
    transactions:transactionRows.length,
    trades:tradeRows.length,
    matchups:matchupRows.length,
    traded_picks:tradedPickRows.length,
    drafts:draftRows.length,
    bracket_rows:bracketRows.length
  };

  const { error: runError } = await supabase.from("sync_runs").update({
    status:"success",
    completed_at:now,
    counts,
    integrity:snapshot.integrity,
    error:null
  }).eq("id",runId);
  if (runError) throw runError;

  return counts;
}

export async function syncSleeper() {
  await seedLeagueAndFranchises();
  const supabase = createAdminSupabase();

  const { data:run, error:runError } = await supabase.from("sync_runs").insert({
    league_id:OKFL_LEAGUE_ID,
    season:SYNC_SEASON,
    status:"running"
  }).select("id").single();
  if (runError || !run) throw runError ?? new Error("Could not create sync run.");

  try {
    const [league,state,users,rosters,tradedPicks,winnersBracket,losersBracket,drafts] = await Promise.all([
      sleeper<any>(`/league/${SLEEPER_LEAGUE_ID}`),
      sleeper<any>(`/state/nfl`),
      sleeper<any[]>(`/league/${SLEEPER_LEAGUE_ID}/users`),
      sleeper<any[]>(`/league/${SLEEPER_LEAGUE_ID}/rosters`),
      sleeper<any[]>(`/league/${SLEEPER_LEAGUE_ID}/traded_picks`),
      sleeper<any[]>(`/league/${SLEEPER_LEAGUE_ID}/winners_bracket`).catch(()=>[]),
      sleeper<any[]>(`/league/${SLEEPER_LEAGUE_ID}/losers_bracket`).catch(()=>[]),
      sleeper<any[]>(`/league/${SLEEPER_LEAGUE_ID}/drafts`).catch(()=>[])
    ]);

    const weeks = Array.from({length:18},(_,index)=>index+1);
    const [transactionWeeks,matchupWeeks,draftPickGroups] = await Promise.all([
      Promise.all(weeks.map((week)=>sleeper<any[]>(`/league/${SLEEPER_LEAGUE_ID}/transactions/${week}`).catch(()=>[]))),
      Promise.all(weeks.map((week)=>sleeper<any[]>(`/league/${SLEEPER_LEAGUE_ID}/matchups/${week}`).catch(()=>[]))),
      Promise.all(drafts.map((draft:any)=>sleeper<any[]>(`/draft/${draft.draft_id}/picks`).catch(()=>[])))
    ]);

    const savedOverrides=await loadCommissionerOverrides();
    const { mappedUsers,userToFranchise,unresolved:unresolvedUsers } = mapUsers(users,savedOverrides);
    const { mappedRosters,rosterToFranchise,unresolved:unresolvedRosters } = buildRosterMap(
      rosters,
      userToFranchise,
      savedOverrides.rosterMap
    );
    const { mapped:transactions,mappedTrades } = mapTransactions(transactionWeeks,rosterToFranchise);
    const matchups = mapMatchups(matchupWeeks,rosterToFranchise);
    const mappedDrafts=drafts.map((draft:any,index:number)=>({
      ...draft,
      picks:(draftPickGroups[index]??[]).map((pick:any)=>({
        ...pick,
        franchise_id:rosterToFranchise[String(pick.roster_id)]??userToFranchise[String(pick.picked_by)]??null
      }))
    }));

    const snapshot = {
      version:2,
      league_id:SLEEPER_LEAGUE_ID,
      synced_at:new Date().toISOString(),
      league,
      nfl_state:state,
      users:mappedUsers,
      rosters:mappedRosters,
      traded_picks:tradedPicks,
      winners_bracket:winnersBracket,
      losers_bracket:losersBracket,
      drafts:mappedDrafts,
      transactions,
      trades:mappedTrades,
      matchups,
      integrity:{
        unresolved_users:unresolvedUsers,
        unresolved_rosters:unresolvedRosters,
        mapped_users:mappedUsers.filter((user)=>user.franchise_id).length,
        mapped_rosters:mappedRosters.filter((roster)=>roster.franchise_id).length
      }
    };

    const savedCounts = await saveSnapshot(snapshot,run.id);
    const powerRankings=await saveLivePowerSnapshot(snapshot,run.id);
    const counts={...savedCounts,power_rankings:powerRankings.rankings.length};
    const {error:finalizeError}=await supabase.from("sync_runs").update({counts}).eq("id",run.id);
    if(finalizeError)throw finalizeError;
    return { snapshot, counts, run_id:run.id, power_rankings:powerRankings };
  } catch (error) {
    await supabase.from("sync_runs").update({
      status:"failed",
      completed_at:new Date().toISOString(),
      error:error instanceof Error ? error.message : String(error)
    }).eq("id",run.id);
    throw error;
  }
}

export async function readSleeperSnapshot() {
  const supabase = createAdminSupabase();

  const [
    usersResult,
    rostersResult,
    transactionsResult,
    tradesResult,
    matchupsResult,
    picksResult,
    draftsResult,
    bracketsResult,
    latestRunResult
  ] = await Promise.all([
    supabase.from("sleeper_users").select("*").eq("league_id",OKFL_LEAGUE_ID).eq("season",SYNC_SEASON),
    supabase.from("sleeper_rosters").select("*").eq("league_id",OKFL_LEAGUE_ID).eq("season",SYNC_SEASON),
    supabase.from("sleeper_transactions").select("*").eq("league_id",OKFL_LEAGUE_ID).eq("season",SYNC_SEASON),
    supabase.from("sleeper_trades").select("*").eq("league_id",OKFL_LEAGUE_ID).eq("season",SYNC_SEASON),
    supabase.from("sleeper_matchups").select("*").eq("league_id",OKFL_LEAGUE_ID).eq("season",SYNC_SEASON).order("week"),
    supabase.from("sleeper_traded_picks").select("*").eq("league_id",OKFL_LEAGUE_ID).eq("season",SYNC_SEASON),
    supabase.from("sleeper_drafts").select("*").eq("league_id",OKFL_LEAGUE_ID).eq("season",SYNC_SEASON),
    supabase.from("sleeper_brackets").select("*").eq("league_id",OKFL_LEAGUE_ID).eq("season",SYNC_SEASON),
    supabase.from("sync_runs").select("*").eq("league_id",OKFL_LEAGUE_ID).eq("season",SYNC_SEASON).order("started_at",{ascending:false}).limit(1).maybeSingle()
  ]);

  const errors = [
    usersResult.error,rostersResult.error,transactionsResult.error,tradesResult.error,
    matchupsResult.error,picksResult.error,draftsResult.error,bracketsResult.error,latestRunResult.error
  ].filter(Boolean);

  if (errors.length) throw new Error(errors.map((error:any)=>error.message).join(" | "));

  const hasData = Boolean(
    usersResult.data?.length ||
    rostersResult.data?.length ||
    transactionsResult.data?.length ||
    matchupsResult.data?.length
  );
  if (!hasData) return null;

  const users = (usersResult.data ?? []).map((row:any)=>({
    ...row.raw,
    franchise_id:row.franchise_id,
    franchise:row.franchise_id ? franchiseNames[row.franchise_id] : null
  }));

  const rosters = (rostersResult.data ?? []).map((row:any)=>({
    ...row.raw,
    franchise_id:row.franchise_id,
    franchise:row.franchise_id ? franchiseNames[row.franchise_id] : null
  }));

  const brackets = bracketsResult.data ?? [];
  const unresolvedUsers = users
    .filter((user:any)=>!user.franchise_id)
    .map((user:any)=>({
      user_id:user.user_id,
      username:user.username,
      display_name:user.display_name,
      team_name:user.metadata?.team_name ?? null
    }));
  const unresolvedRosters = rosters
    .filter((roster:any)=>!roster.franchise_id)
    .map((roster:any)=>({roster_id:roster.roster_id,owner_id:roster.owner_id}));

  return {
    version:2,
    league_id:SLEEPER_LEAGUE_ID,
    synced_at:latestRunResult.data?.completed_at ?? latestRunResult.data?.started_at ?? null,
    users,
    rosters,
    transactions:transactionsResult.data ?? [],
    trades:tradesResult.data ?? [],
    matchups:matchupsResult.data ?? [],
    traded_picks:picksResult.data ?? [],
    drafts:(draftsResult.data ?? []).map((row:any)=>({...row.raw,picks:row.raw?.picks??[]})),
    winners_bracket:brackets.filter((row:any)=>row.bracket_type==="winners").map((row:any)=>row.row_data),
    losers_bracket:brackets.filter((row:any)=>row.bracket_type==="losers").map((row:any)=>row.row_data),
    nfl_state:{season:SYNC_SEASON,week:null,season_type:null},
    league:{status:"active"},
    integrity:{
      unresolved_users:unresolvedUsers,
      unresolved_rosters:unresolvedRosters,
      mapped_users:users.filter((user:any)=>user.franchise_id).length,
      mapped_rosters:rosters.filter((roster:any)=>roster.franchise_id).length
    },
    latest_sync_run:latestRunResult.data ?? null
  };
}

export async function getSyncHistory(limit=10) {
  const supabase = createAdminSupabase();
  const { data,error } = await supabase
    .from("sync_runs")
    .select("*")
    .eq("league_id",OKFL_LEAGUE_ID)
    .eq("season",SYNC_SEASON)
    .order("started_at",{ascending:false})
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
