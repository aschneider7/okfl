import {createSign} from "node:crypto";

type PushMessage={title:string;body:string;url:string;kind:"announcement"|"poll"};
type PushResult={installationId:string;status:"queued"|"failed";messageId:string|null;error:string|null};

let cachedAccessToken:{value:string;expiresAt:number}|null=null;

function base64url(value:string|Buffer){return Buffer.from(value).toString("base64url")}

export function firebasePushIsConfigured(){
  return Boolean(process.env.FIREBASE_PROJECT_ID&&process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY);
}

async function getAccessToken(){
  if(cachedAccessToken&&cachedAccessToken.expiresAt>Date.now()+60_000)return cachedAccessToken.value;
  const clientEmail=process.env.FIREBASE_CLIENT_EMAIL||"";
  const privateKey=(process.env.FIREBASE_PRIVATE_KEY||"").replace(/\\n/g,"\n");
  if(!clientEmail||!privateKey)throw new Error("Firebase service-account credentials are not configured.");
  const now=Math.floor(Date.now()/1000);
  const header=base64url(JSON.stringify({alg:"RS256",typ:"JWT"}));
  const claims=base64url(JSON.stringify({iss:clientEmail,scope:"https://www.googleapis.com/auth/firebase.messaging",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600}));
  const unsigned=`${header}.${claims}`;
  const signer=createSign("RSA-SHA256");signer.update(unsigned);signer.end();
  const assertion=`${unsigned}.${signer.sign(privateKey).toString("base64url")}`;
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion})});
  const result=await response.json().catch(()=>({})) as {access_token?:string;expires_in?:number;error_description?:string};
  if(!response.ok||!result.access_token)throw new Error(result.error_description||`Firebase authorization failed (${response.status}).`);
  cachedAccessToken={value:result.access_token,expiresAt:Date.now()+(Number(result.expires_in||3600)*1000)};
  return result.access_token;
}

function absoluteUrl(value:string){
  const base=String(process.env.NEXT_PUBLIC_SITE_URL||"").replace(/\/$/,"");
  if(/^https?:\/\//i.test(value))return value;
  return `${base}${value.startsWith("/")?value:`/${value}`}`;
}

export async function sendFirebasePush(installationIds:string[],message:PushMessage):Promise<PushResult[]>{
  if(!installationIds.length)return [];
  if(!firebasePushIsConfigured())return installationIds.map((installationId)=>({installationId,status:"failed",messageId:null,error:"Firebase push is not configured."}));
  const accessToken=await getAccessToken();const projectId=process.env.FIREBASE_PROJECT_ID||"";const url=absoluteUrl(message.url);
  return Promise.all(installationIds.map(async(installationId)=>{
    try{
      const response=await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"},body:JSON.stringify({message:{fid:installationId,data:{title:message.title,body:message.body,url,kind:message.kind},webpush:{headers:{TTL:"86400",Urgency:"normal"},notification:{title:message.title,body:message.body||"Open OKFL OS for the details.",icon:"/pwa-192.png",badge:"/pwa-192.png",tag:`okfl-${message.kind}`,renotify:true},fcm_options:{link:url}}}})});
      const result=await response.json().catch(()=>({})) as {name?:string;error?:{message?:string}};
      if(!response.ok)return {installationId,status:"failed" as const,messageId:null,error:String(result.error?.message||`FCM returned ${response.status}`).slice(0,500)};
      return {installationId,status:"queued" as const,messageId:String(result.name||""),error:null};
    }catch(error){return {installationId,status:"failed" as const,messageId:null,error:error instanceof Error?error.message.slice(0,500):"FCM request failed."};}
  }));
}
