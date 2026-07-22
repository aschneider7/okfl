"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {accountEmail} from "@/lib/accountIdentity";
import {getSupabaseBrowserClient} from "@/lib/supabaseBrowser";
import {useAuth} from "@/components/AuthProvider";

export default function LoginPage(){
  const [username,setUsername]=useState("");const [password,setPassword]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const {account,loading}=useAuth();const router=useRouter();
  useEffect(()=>{if(!loading&&account&&!account.mustChangePassword)router.replace("/account")},[account,loading,router]);
  async function submit(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError("");
    const supabase=getSupabaseBrowserClient();
    if(!supabase){setError("Account login is not configured yet.");setBusy(false);return}
    const email=accountEmail(username);
    if(!email){setError("Enter your OKFL username.");setBusy(false);return}
    const {data,error:loginError}=await supabase.auth.signInWithPassword({email,password});
    if(loginError||!data.session){setError("That username or password is incorrect.");setBusy(false);return}
    const response=await fetch("/api/auth/me",{headers:{Authorization:`Bearer ${data.session.access_token}`}});
    if(!response.ok){await supabase.auth.signOut();setError("This login is not linked to an OKFL franchise.");setBusy(false);return}
    const profile=await response.json();
    const requested=new URLSearchParams(window.location.search).get("next");
    const safeNext=requested?.startsWith("/")&&!requested.startsWith("//")?requested:"/account";
    router.replace(profile.mustChangePassword?`/account/change-password?next=${encodeURIComponent(safeNext)}`:safeNext);
    router.refresh();
  }
  return <section className="authPage"><div className="authShell"><div className="authIntro"><span className="eyebrow">League accounts</span><h1>Your franchise.<br/>Your access.</h1><p>Sign in with the username and temporary password issued for your OKFL franchise.</p><div className="authMarks"><span>10 franchises</span><span>Invite only</span><span>Private access</span></div></div><form className="authForm" onSubmit={submit}><span className="eyebrow">Manager sign in</span><h2>Welcome back.</h2><p>First-time users will create a private password immediately after signing in.</p><label>Username<input autoCapitalize="none" autoCorrect="off" autoComplete="username" value={username} onChange={(event)=>setUsername(event.target.value)} placeholder="aaron" required/></label><label>Temporary or current password<input type="password" autoComplete="current-password" value={password} onChange={(event)=>setPassword(event.target.value)} required/></label>{error&&<div className="authError" role="alert">{error}</div>}<button disabled={busy}>{busy?"Signing in…":"Sign in to OKFL"}</button><Link href="/">Return to league home</Link></form></div></section>;
}
