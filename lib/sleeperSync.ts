import { list, put } from "@vercel/blob";

export const SLEEPER_LEAGUE_ID = "1381102523590389760";
const SNAPSHOT_PATH = "okfl/sleeper-2026.json";
const API = "https://api.sleeper.app/v1";

const identityAliases: Record<string, string> = {
  chickenshnoodle: "F01", shnoods: "F01", aaron: "F01",
  elieoj: "F02", elie: "F02", blow: "F02",
  sammyreghini: "F03", sammy: "F03",
  imikhli414: "F04", isaac: "F04",
  jmikhli: "F05", jacob: "F05", tzvi: "F05", jickli: "F05",
  woodjablowme: "F06", fucknickchubb: "F06", usher: "F06",
  joshgorb: "F07", gorb: "F07", josh: "F07",
  haimyboolbool: "F08", nathansiddd: "F08", haimy: "F08", nathan: "F08",
  mauriceb: "F09", maurice: "F09", teddylozieh: "F09",
  sean69420: "F10", sean: "F10",
};

const franchiseNames: Record<string,string> = {
  F01:"Shnoods",F02:"Blow",F03:"Sammy",F04:"Isaac",F05:"Jacob",F06:"Usher",F07:"Gorb",F08:"Haimy",F09:"Maurice",F10:"Sean"
};

function norm(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function sleeper<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Sleeper ${path} returned ${response.status}`);
  return response.json() as Promise<T>;
}

function mapUsers(users: any[]) {
  const userToFranchise: Record<string,string> = {};
  const unresolved: any[] = [];
  const mappedUsers = users.map((user) => {
    const candidates = [user.username, user.display_name, user.metadata?.team_name];
    const franchiseId = candidates.map(norm).map(x => identityAliases[x]).find(Boolean) ?? null;
    if (franchiseId) userToFranchise[user.user_id] = franchiseId;
    else unresolved.push({ user_id:user.user_id, username:user.username, display_name:user.display_name, team_name:user.metadata?.team_name ?? null });
    return { ...user, franchise_id: franchiseId, franchise: franchiseId ? franchiseNames[franchiseId] : null };
  });
  return { mappedUsers, userToFranchise, unresolved };
}

function buildRosterMap(rosters: any[], userToFranchise: Record<string,string>) {
  const rosterToFranchise: Record<string,string> = {};
  const unresolved: any[] = [];
  const mappedRosters = rosters.map(roster => {
    const franchiseId = userToFranchise[roster.owner_id] ?? null;
    if (franchiseId) rosterToFranchise[String(roster.roster_id)] = franchiseId;
    else unresolved.push({ roster_id:roster.roster_id, owner_id:roster.owner_id });
    return { ...roster, franchise_id:franchiseId, franchise:franchiseId ? franchiseNames[franchiseId] : null };
  });
  return { mappedRosters, rosterToFranchise, unresolved };
}

function mapTransactions(weeks: any[][], rosterToFranchise: Record<string,string>) {
  const mapped: any[] = [];
  const mappedTrades: any[] = [];
  weeks.flat().forEach(tx => {
    const adds = Object.entries(tx.adds ?? {}).map(([player_id, roster_id]) => ({ player_id, roster_id, franchise_id:rosterToFranchise[String(roster_id)] ?? null }));
    const drops = Object.entries(tx.drops ?? {}).map(([player_id, roster_id]) => ({ player_id, roster_id, franchise_id:rosterToFranchise[String(roster_id)] ?? null }));
    const record = { ...tx, adds, drops };
    mapped.push(record);
    if (tx.type === "trade" && tx.status === "complete") {
      const sides: Record<string,{franchise_id:string,franchise:string,players_received:string[],players_sent:string[]}> = {};
      for (const add of adds) if (add.franchise_id) {
        sides[add.franchise_id] ??= { franchise_id:add.franchise_id, franchise:franchiseNames[add.franchise_id], players_received:[], players_sent:[] };
        sides[add.franchise_id].players_received.push(add.player_id);
      }
      for (const drop of drops) if (drop.franchise_id) {
        sides[drop.franchise_id] ??= { franchise_id:drop.franchise_id, franchise:franchiseNames[drop.franchise_id], players_received:[], players_sent:[] };
        sides[drop.franchise_id].players_sent.push(drop.player_id);
      }
      mappedTrades.push({ transaction_id:tx.transaction_id, status:tx.status, week:tx.leg ?? tx.week ?? null, created:tx.created, draft_picks:tx.draft_picks ?? [], waiver_budget:tx.waiver_budget ?? [], sides:Object.values(sides) });
    }
  });
  return { mapped, mappedTrades };
}

function mapMatchups(weeks: any[][], rosterToFranchise: Record<string,string>) {
  return weeks.flatMap((rows, index) => rows.map(row => ({ ...row, week:index+1, franchise_id:rosterToFranchise[String(row.roster_id)] ?? null, franchise:franchiseNames[rosterToFranchise[String(row.roster_id)]] ?? null })));
}

export async function syncSleeper() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  const [league, state, users, rosters, tradedPicks, winnersBracket, losersBracket, drafts] = await Promise.all([
    sleeper<any>(`/league/${SLEEPER_LEAGUE_ID}`), sleeper<any>(`/state/nfl`), sleeper<any[]>(`/league/${SLEEPER_LEAGUE_ID}/users`), sleeper<any[]>(`/league/${SLEEPER_LEAGUE_ID}/rosters`), sleeper<any[]>(`/league/${SLEEPER_LEAGUE_ID}/traded_picks`), sleeper<any[]>(`/league/${SLEEPER_LEAGUE_ID}/winners_bracket`).catch(()=>[]), sleeper<any[]>(`/league/${SLEEPER_LEAGUE_ID}/losers_bracket`).catch(()=>[]), sleeper<any[]>(`/league/${SLEEPER_LEAGUE_ID}/drafts`).catch(()=>[]),
  ]);
  const weeks = Array.from({length:18},(_,i)=>i+1);
  const [transactionWeeks, matchupWeeks] = await Promise.all([
    Promise.all(weeks.map(week=>sleeper<any[]>(`/league/${SLEEPER_LEAGUE_ID}/transactions/${week}`).catch(()=>[]))),
    Promise.all(weeks.map(week=>sleeper<any[]>(`/league/${SLEEPER_LEAGUE_ID}/matchups/${week}`).catch(()=>[]))),
  ]);
  const { mappedUsers, userToFranchise, unresolved:unresolvedUsers } = mapUsers(users);
  const { mappedRosters, rosterToFranchise, unresolved:unresolvedRosters } = buildRosterMap(rosters,userToFranchise);
  const { mapped:transactions, mappedTrades } = mapTransactions(transactionWeeks,rosterToFranchise);
  const matchups = mapMatchups(matchupWeeks,rosterToFranchise);
  const snapshot = {
    version:1, league_id:SLEEPER_LEAGUE_ID, synced_at:new Date().toISOString(), league, nfl_state:state,
    users:mappedUsers, rosters:mappedRosters, traded_picks:tradedPicks, winners_bracket:winnersBracket, losers_bracket:losersBracket, drafts,
    transactions, trades:mappedTrades, matchups,
    integrity:{ unresolved_users:unresolvedUsers, unresolved_rosters:unresolvedRosters, mapped_users:mappedUsers.filter(x=>x.franchise_id).length, mapped_rosters:mappedRosters.filter(x=>x.franchise_id).length }
  };
  const blob = await put(SNAPSHOT_PATH, JSON.stringify(snapshot), { access:"public", addRandomSuffix:false, allowOverwrite:true, contentType:"application/json", cacheControlMaxAge:60 });
  return { snapshot, blob };
}

export async function readSleeperSnapshot() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const result = await list({ prefix: SNAPSHOT_PATH, limit:10 });
  const blob = result.blobs.find(item=>item.pathname===SNAPSHOT_PATH) ?? result.blobs[0];
  if (!blob) return null;
  const response = await fetch(blob.url, { cache:"no-store" });
  if (!response.ok) return null;
  return response.json();
}
