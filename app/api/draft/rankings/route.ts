import {NextResponse} from "next/server";
import {getDraftRankingsResponse} from "@/lib/draftRankingsServer";

export async function GET() {
  const rankings=await getDraftRankingsResponse();
  const cache=rankings.meta.source==="live"
    ?"public, s-maxage=43200, stale-while-revalidate=86400"
    :"public, s-maxage=900, stale-while-revalidate=3600";
  return NextResponse.json(rankings,{headers:{"Cache-Control":cache}});
}
