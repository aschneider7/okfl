import {NextResponse} from "next/server";
import {getAccountFromRequest} from "@/lib/accountServer";
import {buildSmsBody,cleanChoices,communicationUrl,normalizePhone,sendLeagueSms,smsIsConfigured,type CommunicationKind} from "@/lib/leagueCommunications";
import {firebasePushIsConfigured,sendFirebasePush} from "@/lib/firebasePush";
import {createAdminSupabase} from "@/lib/supabaseServer";

async function commissioner(request:Request){
  const account=await getAccountFromRequest(request);
  return account?.role==="commissioner"&&!account.mustChangePassword?account:null;
}

function summarize(communications:any[],votes:any[],recipients:any[]){
  return communications.map((row)=>{
    const rowVotes=votes.filter((vote)=>vote.communication_id===row.id);
    const results=(Array.isArray(row.choices)?row.choices:[]).map((choice:any)=>({...choice,votes:rowVotes.filter((vote)=>vote.option_id===choice.id).length}));
    const deliveries=recipients.filter((recipient)=>recipient.communication_id===row.id);
    return {...row,results,totalVotes:rowVotes.length,recipientCount:deliveries.length,push:{queued:deliveries.reduce((total,item)=>total+Number(item.push_success_count||0),0),failed:deliveries.reduce((total,item)=>total+Number(item.push_failure_count||0),0),notEnabled:deliveries.filter((item)=>item.push_status==="not_enabled").length,notConfigured:deliveries.filter((item)=>item.push_status==="not_configured").length},sms:{queued:deliveries.filter((item)=>item.sms_status==="queued").length,failed:deliveries.filter((item)=>item.sms_status==="failed").length,notConsented:deliveries.filter((item)=>item.sms_status==="not_consented").length,notConfigured:deliveries.filter((item)=>item.sms_status==="not_configured").length}};
  });
}

export async function GET(request:Request){
  try{
    if(!await commissioner(request))return NextResponse.json({error:"Commissioner account required."},{status:403});
    const supabase=createAdminSupabase();
    const [accountsResult,contactsResult,communicationsResult,votesResult,recipientsResult,devicesResult]=await Promise.all([
      supabase.from("franchise_accounts").select("user_id,franchise_id,username,display_name,franchises(name)").order("franchise_id"),
      supabase.from("league_contacts").select("user_id,franchise_id,phone_e164,sms_opted_in,consent_confirmed_at,updated_at"),
      supabase.from("league_communications").select("id,kind,title,body,choices,status,closes_at,sms_requested,created_at,closed_at").order("created_at",{ascending:false}).limit(30),
      supabase.from("league_votes").select("communication_id,user_id,option_id"),
      supabase.from("league_communication_recipients").select("communication_id,user_id,sms_status,push_status,push_success_count,push_failure_count"),
      supabase.from("manager_push_devices").select("user_id").eq("enabled",true),
    ]);
    const error=accountsResult.error||contactsResult.error||communicationsResult.error||votesResult.error||recipientsResult.error||devicesResult.error;
    if(error)throw error;
    const contactByUser=new Map((contactsResult.data||[]).map((row:any)=>[row.user_id,row]));
    const deviceCount=new Map<string,number>();for(const device of devicesResult.data||[])deviceCount.set(device.user_id,(deviceCount.get(device.user_id)||0)+1);
    const contacts=(accountsResult.data||[]).map((row:any)=>{const contact:any=contactByUser.get(row.user_id)||{};const franchise=Array.isArray(row.franchises)?row.franchises[0]:row.franchises;return {userId:row.user_id,franchiseId:row.franchise_id,franchise:franchise?.name||row.franchise_id,username:row.username,displayName:row.display_name,phone:contact.phone_e164||"",smsOptedIn:Boolean(contact.sms_opted_in),consentConfirmedAt:contact.consent_confirmed_at||null,updatedAt:contact.updated_at||null,pushDevices:deviceCount.get(row.user_id)||0};});
    return NextResponse.json({contacts,communications:summarize(communicationsResult.data||[],votesResult.data||[],recipientsResult.data||[]),smsConfigured:smsIsConfigured(),pushConfigured:firebasePushIsConfigured()});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not load league communications."},{status:500});}
}

export async function PATCH(request:Request){
  try{
    const account=await commissioner(request);if(!account)return NextResponse.json({error:"Commissioner account required."},{status:403});
    const body=await request.json().catch(()=>({}));const supabase=createAdminSupabase();
    if(body.action==="close"){
      const communicationId=String(body.communicationId||"");
      const {error}=await supabase.from("league_communications").update({status:"closed",closed_at:new Date().toISOString()}).eq("id",communicationId).eq("kind","poll");
      if(error)throw error;return NextResponse.json({ok:true});
    }
    const userId=String(body.userId||"");if(!userId)return NextResponse.json({error:"Choose a manager."},{status:400});
    const phone=normalizePhone(String(body.phone||""));const optedIn=Boolean(body.smsOptedIn);
    if(optedIn&&!body.consentConfirmed)return NextResponse.json({error:"Confirm that this manager explicitly agreed to receive OKFL texts."},{status:400});
    const {data:target,error:targetError}=await supabase.from("franchise_accounts").select("franchise_id").eq("user_id",userId).maybeSingle();
    if(targetError||!target)return NextResponse.json({error:"Manager account not found."},{status:404});
    const payload={user_id:userId,franchise_id:target.franchise_id,phone_e164:phone,sms_opted_in:Boolean(optedIn&&phone),consent_confirmed_at:optedIn&&phone?new Date().toISOString():null,updated_by:account.userId,updated_at:new Date().toISOString()};
    const {error}=await supabase.from("league_contacts").upsert(payload,{onConflict:"user_id"});if(error)throw error;
    return NextResponse.json({ok:true,phone,smsOptedIn:payload.sms_opted_in,consentConfirmedAt:payload.consent_confirmed_at});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not save contact."},{status:500});}
}

export async function POST(request:Request){
  try{
    const account=await commissioner(request);if(!account)return NextResponse.json({error:"Commissioner account required."},{status:403});
    const body=await request.json().catch(()=>({}));const kind:CommunicationKind=body.kind==="poll"?"poll":"announcement";
    const title=String(body.title||"").trim().replace(/\s+/g," "),message=String(body.body||"").trim();
    if(title.length<3||title.length>120)return NextResponse.json({error:"Use a title between 3 and 120 characters."},{status:400});
    if(message.length>2000)return NextResponse.json({error:"Announcement text must be 2,000 characters or fewer."},{status:400});
    const choices=cleanChoices(body.choices);if(kind==="poll"&&choices.length<2)return NextResponse.json({error:"A league vote needs at least two distinct choices."},{status:400});
    const closesAt=body.closesAt?new Date(String(body.closesAt)):null;if(closesAt&&Number.isNaN(closesAt.getTime()))return NextResponse.json({error:"Choose a valid closing date."},{status:400});
    const supabase=createAdminSupabase();const requestedIds=Array.isArray(body.recipientUserIds)?body.recipientUserIds.map(String):[];
    let accountQuery=supabase.from("franchise_accounts").select("user_id,display_name");if(requestedIds.length)accountQuery=accountQuery.in("user_id",requestedIds);
    const {data:accounts,error:accountError}=await accountQuery;if(accountError)throw accountError;if(!accounts?.length)return NextResponse.json({error:"Choose at least one recipient."},{status:400});
    const {data:communication,error:createError}=await supabase.from("league_communications").insert({kind,title,body:message,choices,status:"open",closes_at:closesAt?.toISOString()||null,sms_requested:Boolean(body.sendSms),created_by:account.userId}).select("id").single();if(createError||!communication)throw createError||new Error("Communication could not be created.");
    const href=`/league-votes?message=${communication.id}`;
    const {data:notifications,error:notificationError}=await supabase.from("manager_notifications").insert(accounts.map((target:any)=>({user_id:target.user_id,kind:kind==="poll"?"poll":"notification",title,body:message,href}))).select("id,user_id");if(notificationError)throw notificationError;
    const notificationByUser=new Map((notifications||[]).map((row:any)=>[row.user_id,row.id]));
    const {error:recipientError}=await supabase.from("league_communication_recipients").insert(accounts.map((target:any)=>({communication_id:communication.id,user_id:target.user_id,notification_id:notificationByUser.get(target.user_id)||null,sms_status:body.sendSms?"not_consented":"not_requested",push_status:firebasePushIsConfigured()?"not_enabled":"not_configured"})));if(recipientError)throw recipientError;
    const accountIds=accounts.map((target:any)=>target.user_id);let pushSummary={queued:0,failed:0,skipped:accounts.length};
    if(firebasePushIsConfigured()){
      const {data:devices,error:deviceError}=await supabase.from("manager_push_devices").select("installation_id,user_id").in("user_id",accountIds).eq("enabled",true);if(deviceError)throw deviceError;
      const devicesByUser=new Map<string,string[]>();for(const device of devices||[])devicesByUser.set(device.user_id,[...(devicesByUser.get(device.user_id)||[]),device.installation_id]);
      const pushDeliveries=await Promise.all(accounts.map(async(target:any)=>{const ids=devicesByUser.get(target.user_id)||[];if(!ids.length)return {userId:target.user_id,status:"not_enabled",success:0,failure:0,error:null};const results=await sendFirebasePush(ids,{kind,title,body:message,url:communicationUrl(request,communication.id)});const success=results.filter((item)=>item.status==="queued").length,failure=results.length-success;return {userId:target.user_id,status:success&&failure?"partial":success?"queued":"failed",success,failure,error:results.find((item)=>item.error)?.error||null};}));
      await Promise.all(pushDeliveries.map((delivery)=>supabase.from("league_communication_recipients").update({push_status:delivery.status,push_success_count:delivery.success,push_failure_count:delivery.failure,push_error:delivery.error}).eq("communication_id",communication.id).eq("user_id",delivery.userId)));
      pushSummary={queued:pushDeliveries.reduce((total,item)=>total+item.success,0),failed:pushDeliveries.reduce((total,item)=>total+item.failure,0),skipped:pushDeliveries.filter((item)=>item.status==="not_enabled").length};
    }
    let smsSummary={queued:0,failed:0,skipped:accounts.length};
    if(body.sendSms){
      const ids=accounts.map((target:any)=>target.user_id);const {data:contacts,error:contactError}=await supabase.from("league_contacts").select("user_id,phone_e164,sms_opted_in").in("user_id",ids);if(contactError)throw contactError;
      const contactByUser=new Map((contacts||[]).map((row:any)=>[row.user_id,row]));const text=buildSmsBody({kind,title,body:message,url:communicationUrl(request,communication.id)});
      const deliveries=await Promise.all(accounts.map(async(target:any)=>{const contact:any=contactByUser.get(target.user_id);if(!contact?.sms_opted_in||!contact.phone_e164)return {userId:target.user_id,status:"not_consented",sid:null,error:null};const sent=await sendLeagueSms(contact.phone_e164,text);return {userId:target.user_id,...sent};}));
      await Promise.all(deliveries.map((delivery)=>supabase.from("league_communication_recipients").update({sms_status:delivery.status,sms_sid:delivery.sid,sms_error:delivery.error}).eq("communication_id",communication.id).eq("user_id",delivery.userId)));
      smsSummary={queued:deliveries.filter((item)=>item.status==="queued").length,failed:deliveries.filter((item)=>item.status==="failed").length,skipped:deliveries.filter((item)=>item.status==="not_consented"||item.status==="not_configured").length};
    }
    return NextResponse.json({ok:true,id:communication.id,recipients:accounts.length,push:pushSummary,sms:smsSummary},{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not publish communication."},{status:500});}
}
