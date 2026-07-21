"use client";

import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useAuth} from "@/components/AuthProvider";

export default function ChangePasswordPage(){
  const [password,setPassword]=useState("");const [confirm,setConfirm]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const {session,account,loading,authFetch,refreshAccount}=useAuth();const router=useRouter();
  async function submit(event:React.FormEvent){event.preventDefault();setError("");if(password!==confirm){setError("The passwords do not match.");return}setBusy(true);const response=await authFetch("/api/auth/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});const body=await response.json();if(!response.ok){setError(body.error||"Unable to update password.");setBusy(false);return}await refreshAccount();const requested=new URLSearchParams(window.location.search).get("next");const safeNext=requested?.startsWith("/")&&!requested.startsWith("//")?requested:"/account";router.replace(safeNext);router.refresh()}
  if(loading)return <div className="card loadingCard"><span/>Loading account…</div>;
  if(!session||!account)return <section className="accountGate card"><h1>Sign in first.</h1><p>You need an active franchise account before changing its password.</p><Link href="/login?next=/account/change-password">Open account login</Link></section>;
  return <section className="authPage"><div className="passwordShell"><span className="eyebrow">Account security · {account.franchiseName}</span><h1>{account.mustChangePassword?"Create your private password.":"Change your password."}</h1><p>Use at least 10 characters with uppercase, lowercase, and a number. Do not reuse the temporary password.</p><form onSubmit={submit}><label>New password<input type="password" autoComplete="new-password" value={password} onChange={(event)=>setPassword(event.target.value)} required minLength={10}/></label><label>Confirm new password<input type="password" autoComplete="new-password" value={confirm} onChange={(event)=>setConfirm(event.target.value)} required minLength={10}/></label>{error&&<div className="authError" role="alert">{error}</div>}<button disabled={busy}>{busy?"Saving…":"Save private password"}</button></form>{!account.mustChangePassword&&<Link href="/account">Cancel and return to account</Link>}</div></section>;
}
