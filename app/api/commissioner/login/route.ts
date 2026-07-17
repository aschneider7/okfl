import { NextResponse } from "next/server";
import { setCommissionerCookie, verifyPassword } from "@/lib/commissionerAuth";
export async function POST(request: Request) {
  const body = await request.json().catch(()=>({}));
  if (!verifyPassword(String(body.password ?? ""))) return NextResponse.json({error:"Incorrect password."},{status:401});
  await setCommissionerCookie();
  return NextResponse.json({ok:true});
}
