import {NextResponse} from "next/server";
import {getAccountFromRequest} from "@/lib/accountServer";
import {createAdminSupabase} from "@/lib/supabaseServer";

export async function GET(request:Request){
  try{
    const account=await getAccountFromRequest(request);if(!account||account.mustChangePassword)return NextResponse.json({error:"Manager sign-in required."},{status:401});
    const supabase=createAdminSupabase();const {data:recipients,error:recipientError}=await supabase.from("league_communication_recipients").select("communication_id").eq("user_id",account.userId).order("created_at",{ascending:false});if(recipientError)throw recipientError;
    const ids=(recipients||[]).map((row:any)=>row.communication_id);if(!ids.length)return NextResponse.json({communications:[]});
    const [communicationsResult,votesResult]=await Promise.all([supabase.from("league_communications").select("id,kind,title,body,choices,status,closes_at,created_at,closed_at").in("id",ids).order("created_at",{ascending:false}),supabase.from("league_votes").select("communication_id,user_id,option_id").in("communication_id",ids)]);
    if(communicationsResult.error||votesResult.error)throw communicationsResult.error||votesResult.error;
    const now=Date.now(),votes=votesResult.data||[];
    const communications=(communicationsResult.data||[]).map((row:any)=>{const rowVotes=votes.filter((vote:any)=>vote.communication_id===row.id);const expired=Boolean(row.closes_at&&new Date(row.closes_at).getTime()<=now);return {...row,isOpen:row.kind==="poll"&&row.status==="open"&&!expired,myVote:rowVotes.find((vote:any)=>vote.user_id===account.userId)?.option_id||null,totalVotes:rowVotes.length,results:(Array.isArray(row.choices)?row.choices:[]).map((choice:any)=>({...choice,votes:rowVotes.filter((vote:any)=>vote.option_id===choice.id).length}))};});
    return NextResponse.json({communications});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not load league messages."},{status:500});}
}

export async function POST(request:Request){
  try{
    const account=await getAccountFromRequest(request);if(!account||account.mustChangePassword)return NextResponse.json({error:"Manager sign-in required."},{status:401});
    const body=await request.json().catch(()=>({})),communicationId=String(body.communicationId||""),optionId=String(body.optionId||"");const supabase=createAdminSupabase();
    const [{data:recipient},{data:poll,error:pollError}]=await Promise.all([supabase.from("league_communication_recipients").select("communication_id").eq("communication_id",communicationId).eq("user_id",account.userId).maybeSingle(),supabase.from("league_communications").select("id,kind,status,choices,closes_at").eq("id",communicationId).maybeSingle()]);
    if(pollError)throw pollError;if(!recipient||!poll)return NextResponse.json({error:"This ballot is not available to your franchise."},{status:404});
    if(poll.kind!=="poll"||poll.status!=="open"||(poll.closes_at&&new Date(poll.closes_at).getTime()<=Date.now()))return NextResponse.json({error:"Voting is closed."},{status:409});
    if(!(Array.isArray(poll.choices)&&poll.choices.some((choice:any)=>choice.id===optionId)))return NextResponse.json({error:"Choose a valid ballot option."},{status:400});
    const now=new Date().toISOString();const {error}=await supabase.from("league_votes").upsert({communication_id:communicationId,user_id:account.userId,option_id:optionId,updated_at:now},{onConflict:"communication_id,user_id"});if(error)throw error;
    return NextResponse.json({ok:true,optionId});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Vote could not be recorded."},{status:500});}
}
