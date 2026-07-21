import {NextResponse} from "next/server";
import {getAccountFromRequest} from "@/lib/accountServer";
import {createAdminSupabase} from "@/lib/supabaseServer";

export const runtime="nodejs";

function passwordError(password:string){
  if(password.length<10)return "Use at least 10 characters.";
  if(!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password))return "Include an uppercase letter, lowercase letter, and number.";
  return "";
}

export async function POST(request:Request){
  const account=await getAccountFromRequest(request);
  if(!account)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json().catch(()=>({}));
  const password=String(body.password||"");
  const validation=passwordError(password);
  if(validation)return NextResponse.json({error:validation},{status:400});
  const supabase=createAdminSupabase();
  const {error:userError}=await supabase.auth.admin.updateUserById(account.userId,{password});
  if(userError)return NextResponse.json({error:userError.message},{status:500});
  const {error:accountError}=await supabase.from("franchise_accounts").update({must_change_password:false,updated_at:new Date().toISOString()}).eq("user_id",account.userId);
  if(accountError)return NextResponse.json({error:accountError.message},{status:500});
  return NextResponse.json({ok:true});
}
