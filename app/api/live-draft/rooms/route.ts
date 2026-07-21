import {NextResponse} from "next/server";
import {getAccountFromRequest} from "@/lib/accountServer";
import {draftPlayerKey} from "@/lib/draftRankings";
import {keeperOverall,managers} from "@/lib/draftSimulator";
import {getLockedKeeperBoard} from "@/lib/keeperSubmission";
import {createDraftSecret,createRoomCode,getLiveDraftSnapshot,hashDraftSecret} from "@/lib/liveDraftServer";
import {createAdminSupabase} from "@/lib/supabaseServer";

export async function POST(request:Request){
  try{
    const account=await getAccountFromRequest(request);
    if(!account||account.role!=="commissioner"||account.mustChangePassword)return NextResponse.json({error:"Commissioner account required to create the official room."},{status:403});
    const body=await request.json().catch(()=>({}));
    const roomName=String(body.roomName||"2026 OKFL Live Draft").trim().slice(0,80)||"2026 OKFL Live Draft";
    const clockSeconds=Math.max(1,Math.min(3600,Math.round(Number(body.clockSeconds)||30)));
    const officialKeepers=await getLockedKeeperBoard();
    if(!officialKeepers)return NextResponse.json({error:"Lock the final official keeper board in Commissioner OS before creating the live draft."},{status:409});
    const hostToken=createDraftSecret();const seatToken=createDraftSecret();const supabase=createAdminSupabase();
    let room:{id:string;code:string}|null=null;let lastError:unknown=null;
    for(let attempt=0;attempt<3&&!room;attempt+=1){
      const code=createRoomCode();const result=await supabase.from("live_draft_rooms").insert({code,name:roomName,host_name:account.displayName,host_token_hash:hashDraftSecret(hostToken),settings:{teams:10,rounds:17,scoring:"PPR",clockSeconds}}).select("id,code").single();
      if(!result.error)room=result.data;else lastError=result.error;
    }
    if(!room)throw lastError||new Error("Could not create a unique room code.");
    const claimedAt=new Date().toISOString();
    const seatRows=managers.map((manager)=>({room_id:room!.id,franchise_id:manager.franchiseId,slot:manager.slot,manager_name:manager.manager,pin_hash:null,
      claimed_user_id:manager.franchiseId===account.franchiseId?account.userId:null,claimed_name:manager.franchiseId===account.franchiseId?account.displayName:null,
      claimed_at:manager.franchiseId===account.franchiseId?claimedAt:null,seat_token_hash:manager.franchiseId===account.franchiseId?hashDraftSecret(seatToken):null}));
    const keeperRows=officialKeepers.map((keeper)=>{const manager=managers.find((row)=>row.franchiseId===keeper.franchiseId)!;const overall=keeperOverall(keeper.round,manager.slot);return{
      room_id:room!.id,overall,round:keeper.round,slot:manager.slot,franchise_id:keeper.franchiseId,player_key:draftPlayerKey(keeper.player),keeper:true,keeper_cost:keeper.round,selected_by:"official keeper",
      player:{name:keeper.player,position:keeper.position,team:"—",pprRank:999,pprValue:0,keeperEligible:false,source:"official-keeper"}}});
    const seatResult=await supabase.from("live_draft_seats").insert(seatRows);const keeperResult=seatResult.error?null:await supabase.from("live_draft_picks").insert(keeperRows);
    if(seatResult.error||keeperResult?.error){await supabase.from("live_draft_rooms").delete().eq("id",room.id);throw seatResult.error||keeperResult?.error}
    return NextResponse.json({snapshot:await getLiveDraftSnapshot(room.code),hostToken,seatToken,franchiseId:account.franchiseId,displayName:account.displayName},{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not create the live draft room."},{status:500})}
}
