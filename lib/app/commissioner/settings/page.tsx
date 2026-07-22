"use client";

import Link from "next/link";
import {CommissionerSettings} from "@/components/CommissionerSettings";
import {useAuth} from "@/components/AuthProvider";

export default function CommissionerSettingsPage(){
  const {session,account,loading}=useAuth();
  if(loading)return <div className="card loadingCard"><span/>Checking Commissioner access…</div>;
  if(!session||!account)return <section className="accountGate card"><span className="eyebrow">Commissioner settings</span><h1>Sign in as Aaron.</h1><p>Website controls are available only through the verified Commissioner account.</p><Link href="/login?next=/commissioner/settings">Commissioner sign in</Link></section>;
  if(account.mustChangePassword)return <section className="accountGate card"><span className="eyebrow">First login</span><h1>Create your private password first.</h1><Link href="/account/change-password?next=/commissioner/settings">Change password</Link></section>;
  if(account.role!=="commissioner")return <section className="accountGate card"><span className="eyebrow">Private settings</span><h1>Commissioner access only.</h1><Link href="/account">Return to My Franchise</Link></section>;
  return <CommissionerSettings/>;
}
