import {NextResponse} from "next/server";
import {getAccountFromRequest} from "@/lib/accountServer";

export const runtime="nodejs";

export async function GET(request:Request){
  const account=await getAccountFromRequest(request);
  if(!account)return NextResponse.json({error:"Unauthorized"},{status:401});
  return NextResponse.json(account);
}
