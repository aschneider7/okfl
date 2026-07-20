import {createClient} from "@supabase/supabase-js";
import {randomBytes} from "node:crypto";
import {existsSync,readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";

function loadLocalEnv(){
  for(const filename of [".env.local",".env"]){
    if(!existsSync(filename))continue;
    for(const line of readFileSync(filename,"utf8").split(/\r?\n/)){
      const match=line.match(/^([A-Z0-9_]+)=(.*)$/);
      if(match&&!process.env[match[1]])process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,"");
    }
  }
}

loadLocalEnv();
const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SECRET_KEY;
if(!url||!key)throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local before bootstrapping accounts.");

const accounts=[
  {franchiseId:"F01",franchiseName:"Shnoods",username:"aaron",displayName:"Aaron",role:"commissioner"},
  {franchiseId:"F02",franchiseName:"Blow",username:"elie",displayName:"Elie",role:"manager"},
  {franchiseId:"F03",franchiseName:"Sammy",username:"sammy",displayName:"Sammy",role:"manager"},
  {franchiseId:"F04",franchiseName:"Isaac",username:"isaac",displayName:"Isaac",role:"manager"},
  {franchiseId:"F05",franchiseName:"Jacob",username:"tzvi",displayName:"Tzvi",role:"manager"},
  {franchiseId:"F06",franchiseName:"Usher",username:"usher",displayName:"Usher",role:"manager"},
  {franchiseId:"F07",franchiseName:"Gorb",username:"josh-teddy",displayName:"Josh + Teddy",role:"manager"},
  {franchiseId:"F08",franchiseName:"Haimy",username:"haimy",displayName:"Haimy",role:"manager"},
  {franchiseId:"F09",franchiseName:"Maurice",username:"maurice",displayName:"Maurice",role:"manager"},
  {franchiseId:"F10",franchiseName:"Sean",username:"sean",displayName:"Sean",role:"manager"},
];

function temporaryPassword(){return `${randomBytes(9).toString("base64url")}A7!`}
const credentialsPath=process.argv[2]?resolve(process.argv[2]):null;
const supplied=credentialsPath?JSON.parse(readFileSync(credentialsPath,"utf8")):[];
const passwords=new Map(supplied.map((row)=>[String(row.username).toLowerCase(),String(row.temporaryPassword)]));
const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:list,error:listError}=await supabase.auth.admin.listUsers({page:1,perPage:1000});
if(listError)throw listError;
const usersByEmail=new Map(list.users.map((user)=>[user.email,user]));
const issued=[];

for(const account of accounts){
  const email=`${account.username}@okfl.example.com`;
  const password=passwords.get(account.username)||temporaryPassword();
  const existing=usersByEmail.get(email);
  const result=existing
    ? await supabase.auth.admin.updateUserById(existing.id,{password,email_confirm:true,user_metadata:{username:account.username,franchise_id:account.franchiseId,role:account.role}})
    : await supabase.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username:account.username,franchise_id:account.franchiseId,role:account.role}});
  if(result.error||!result.data.user)throw new Error(`${account.username}: ${result.error?.message||"Unable to create user"}`);
  const {error:profileError}=await supabase.from("franchise_accounts").upsert({user_id:result.data.user.id,franchise_id:account.franchiseId,username:account.username,display_name:account.displayName,role:account.role,must_change_password:true,updated_at:new Date().toISOString()},{onConflict:"user_id"});
  if(profileError)throw new Error(`${account.username}: ${profileError.message}`);
  issued.push({...account,temporaryPassword:password});
}

mkdirSync("outputs",{recursive:true});
const lines=["OKFL OS — INITIAL ACCOUNT CREDENTIALS","Every manager must change this password on first login.","",...issued.flatMap((row)=>[`${row.franchiseId} · ${row.franchiseName} · ${row.displayName}`,`Username: ${row.username}`,`Temporary password: ${row.temporaryPassword}`,row.role==="commissioner"?"Role: Commissioner":"Role: Manager",""])];
writeFileSync("outputs/OKFL_Initial_Account_Credentials.txt",lines.join("\n"),"utf8");
console.log(lines.join("\n"));
console.log("Saved outputs/OKFL_Initial_Account_Credentials.txt");
