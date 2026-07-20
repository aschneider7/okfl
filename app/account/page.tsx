"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useAuth} from "@/components/AuthProvider";

export default function AccountPage(){
  const {account,session,loading,signOut}=useAuth();const router=useRouter();
  async function logout(){await signOut();router.replace("/");router.refresh()}
  if(loading)return <div className="card loadingCard"><span/>Loading account…</div>;
  if(!session||!account)return <section className="accountGate card"><span className="eyebrow">Manager access</span><h1>Sign in to your franchise.</h1><p>Your OKFL account connects your identity, permissions, and future manager tools.</p><Link href="/login">Open account login</Link></section>;
  return <section className="page accountPage"><div className="pageHead"><div><span>OKFL manager account</span><h1>{account.displayName}</h1></div><p>{account.franchiseName} · {account.franchiseId}</p></div>{account.mustChangePassword&&<section className="passwordRequired"><span>Action required</span><h2>Create your private password.</h2><p>Your temporary password must be replaced before protected tools are available.</p><Link href="/account/change-password">Change password now</Link></section>}<div className="accountGrid"><article className="card accountIdentity"><span className="eyebrow">Assigned franchise</span><b>{account.franchiseName}</b><p>{account.displayName} owns this account.</p><Link href={`/franchises/${account.franchiseId}`}>Open scouting report</Link></article><article className="card"><span className="eyebrow">Account permissions</span><h2>{account.role==="commissioner"?"Commissioner":"League manager"}</h2><p>{account.role==="commissioner"?"Sleeper sync, identity repair, and league administration are enabled.":"Manager features will be connected to this franchise."}</p>{account.role==="commissioner"&&<Link href="/commissioner">Open Commissioner OS</Link>}</article><article className="card"><span className="eyebrow">Security</span><h2>Password and session</h2><p>Update your password or securely sign out of this device.</p><div className="accountActions"><Link href="/account/change-password">Change password</Link><button onClick={logout}>Sign out</button></div></article></div></section>;
}
