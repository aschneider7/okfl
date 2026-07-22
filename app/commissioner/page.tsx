"use client";

import Link from "next/link";
import {CommissionerDashboard} from "@/components/CommissionerDashboard";
import {useAuth} from "@/components/AuthProvider";

export default function CommissionerPage(){
  const {session,account,loading}=useAuth();
  if(loading)return <div className="card loadingCard"><span/>Checking commissioner access…</div>;
  if(!session||!account)return <section className="accountGate card"><span className="eyebrow">Commissioner access</span><h1>A Commissioner account is required.</h1><p>The shared Commissioner password has been removed. Sign in through the main account system.</p><Link href="/login?next=/commissioner">Commissioner sign in</Link></section>;
  if(account.mustChangePassword)return <section className="accountGate card"><span className="eyebrow">First login</span><h1>Create your private password first.</h1><p>Commissioner tools unlock immediately after the required password change.</p><Link href="/account/change-password?next=/commissioner">Change password</Link></section>;
  if(account.role!=="commissioner")return <section className="accountGate card"><span className="eyebrow">Private commissioner tools</span><h1>Manager access only.</h1><p>This page is available only to verified Commissioner accounts.</p><Link href="/account">Return to your account</Link></section>;
  return <CommissionerDashboard/>;
}
