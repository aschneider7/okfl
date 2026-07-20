import {NextResponse} from "next/server";
import {getLiveDraftSnapshot} from "@/lib/liveDraftServer";

export async function GET(_request: Request, context: {params: Promise<{code: string}>}) {
  try {
    const {code} = await context.params;
    const snapshot = await getLiveDraftSnapshot(code);
    return snapshot ? NextResponse.json({snapshot}) : NextResponse.json({error: "Draft room not found."}, {status: 404});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : "Could not load the draft room."}, {status: 500});
  }
}

