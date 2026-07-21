export type CommunicationKind="announcement"|"poll";

export function normalizePhone(value:string){
  const trimmed=String(value||"").trim();
  if(!trimmed)return null;
  let digits=trimmed.replace(/\D/g,"");
  if(digits.length===10)digits=`1${digits}`;
  if(digits.length<8||digits.length>15||digits.startsWith("0"))throw new Error("Enter a valid mobile number with country code, such as +1 212 555 0100.");
  return `+${digits}`;
}

export function cleanChoices(values:unknown){
  if(!Array.isArray(values))return [];
  const labels=values.map((value)=>String(value||"").trim().replace(/\s+/g," ")).filter(Boolean);
  return [...new Set(labels)].slice(0,8).map((label,index)=>({id:`option-${index+1}`,label}));
}

export function smsIsConfigured(){
  return Boolean(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&(process.env.TWILIO_MESSAGING_SERVICE_SID||process.env.TWILIO_FROM_NUMBER));
}

export function buildSmsBody(input:{kind:CommunicationKind;title:string;body:string;url:string}){
  const label=input.kind==="poll"?"OKFL VOTE":"OKFL";
  const detail=input.body.trim().slice(0,360);
  return `${label}: ${input.title}${detail?` — ${detail}`:""}\n${input.url}\nReply STOP to opt out.`;
}

export async function sendLeagueSms(to:string,body:string){
  const accountSid=process.env.TWILIO_ACCOUNT_SID||"",authToken=process.env.TWILIO_AUTH_TOKEN||"";
  if(!smsIsConfigured())return {status:"not_configured" as const,sid:null,error:"SMS provider is not configured."};
  const form=new URLSearchParams({To:to,Body:body});
  if(process.env.TWILIO_MESSAGING_SERVICE_SID)form.set("MessagingServiceSid",process.env.TWILIO_MESSAGING_SERVICE_SID);
  else form.set("From",process.env.TWILIO_FROM_NUMBER||"");
  try{
    const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,"Content-Type":"application/x-www-form-urlencoded"},body:form.toString()});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)return {status:"failed" as const,sid:null,error:String(result.message||`Twilio returned ${response.status}`).slice(0,500)};
    return {status:"queued" as const,sid:String(result.sid||""),error:null};
  }catch(error){return {status:"failed" as const,sid:null,error:error instanceof Error?error.message.slice(0,500):"SMS request failed."};}
}

export function communicationUrl(request:Request,id:string){
  const configured=String(process.env.NEXT_PUBLIC_SITE_URL||"").replace(/\/$/,"");
  const origin=configured||new URL(request.url).origin;
  return `${origin}/league-votes?message=${encodeURIComponent(id)}`;
}
