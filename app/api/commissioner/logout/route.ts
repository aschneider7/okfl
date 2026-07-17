import { NextResponse } from "next/server";
import { clearCommissionerCookie } from "@/lib/commissionerAuth";
export async function POST(){await clearCommissionerCookie();return NextResponse.json({ok:true});}
