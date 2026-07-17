import { NextResponse } from "next/server";
import { isCommissioner } from "@/lib/commissionerAuth";
import { readSleeperSnapshot } from "@/lib/sleeperSync";
export async function GET(){if(!(await isCommissioner()))return NextResponse.json({error:"Unauthorized"},{status:401});const snapshot=await readSleeperSnapshot();return NextResponse.json({configured:Boolean(process.env.BLOB_READ_WRITE_TOKEN),snapshot});}
