import type {AccountProfile,AccountRole} from "@/lib/accountIdentity";
import {createAdminSupabase} from "@/lib/supabaseServer";

function bearerToken(request: Request) {
  const header=request.headers.get("authorization")||"";
  return header.toLowerCase().startsWith("bearer ")?header.slice(7).trim():"";
}

export async function getAccountFromRequest(request: Request): Promise<AccountProfile|null> {
  const token=bearerToken(request);
  if(!token)return null;
  const supabase=createAdminSupabase();
  const {data:userResult,error:userError}=await supabase.auth.getUser(token);
  if(userError||!userResult.user)return null;
  const {data,error}=await supabase
    .from("franchise_accounts")
    .select("user_id,franchise_id,username,display_name,role,must_change_password,franchises(name)")
    .eq("user_id",userResult.user.id)
    .maybeSingle();
  if(error||!data)return null;
  const row=data as any;
  const franchise=Array.isArray(row.franchises)?row.franchises[0]:row.franchises;
  return {
    userId:String(row.user_id),
    franchiseId:String(row.franchise_id),
    franchiseName:String(franchise?.name||row.franchise_id),
    username:String(row.username),
    displayName:String(row.display_name),
    role:String(row.role) as AccountRole,
    mustChangePassword:Boolean(row.must_change_password),
  };
}
