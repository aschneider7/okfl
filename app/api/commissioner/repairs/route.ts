import { NextResponse } from "next/server";
import { isCommissioner } from "@/lib/commissionerAuth";
import {
  deleteUserIdentityRepair,
  getCommissionerRepairData,
  saveRosterIdentityRepair,
  saveUserIdentityRepair,
} from "@/lib/commissionerRepairs";

export const runtime="nodejs";

export async function GET() {
  if (!(await isCommissioner())) {
    return NextResponse.json({error:"Unauthorized"},{status:401});
  }
  try {
    return NextResponse.json(await getCommissionerRepairData());
  } catch(error) {
    return NextResponse.json({
      error:error instanceof Error?error.message:String(error)
    },{status:500});
  }
}

export async function POST(request:Request) {
  if (!(await isCommissioner())) {
    return NextResponse.json({error:"Unauthorized"},{status:401});
  }
  try {
    const body=await request.json();
    if(body.type==="user") {
      const result=await saveUserIdentityRepair({
        externalUserId:String(body.externalUserId||""),
        username:body.username||null,
        displayName:body.displayName||null,
        teamName:body.teamName||null,
        franchiseId:String(body.franchiseId||""),
        note:body.note||null,
      });
      return NextResponse.json({ok:true,result});
    }
    if(body.type==="roster") {
      const result=await saveRosterIdentityRepair({
        rosterId:Number(body.rosterId),
        franchiseId:String(body.franchiseId||""),
        note:body.note||null,
      });
      return NextResponse.json({ok:true,result});
    }
    return NextResponse.json({error:"Unknown repair type."},{status:400});
  } catch(error) {
    return NextResponse.json({
      error:error instanceof Error?error.message:String(error)
    },{status:500});
  }
}

export async function DELETE(request:Request) {
  if (!(await isCommissioner())) {
    return NextResponse.json({error:"Unauthorized"},{status:401});
  }
  try {
    const url=new URL(request.url);
    const externalUserId=url.searchParams.get("externalUserId");
    if(!externalUserId) {
      return NextResponse.json({error:"externalUserId is required."},{status:400});
    }
    await deleteUserIdentityRepair(externalUserId);
    return NextResponse.json({ok:true});
  } catch(error) {
    return NextResponse.json({
      error:error instanceof Error?error.message:String(error)
    },{status:500});
  }
}
