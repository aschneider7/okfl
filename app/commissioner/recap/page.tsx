"use client";
import Link from "next/link";
import {useAuth} from "@/components/AuthProvider";
import {CommissionerRecapEditor} from "@/components/CommissionerRecapEditor";
export default function CommissionerRecapPage(){const {session,account,loading}=useAuth();if(loading)return <div className="card loadingCard"><span/>Checking Commissioner access…</div>;if(!session||!account)return <section className="accountGate card"><h1>Commissioner sign-in required.</h1><Link href="/login?next=/commissioner/recap">Sign in</Link></section>;if(account.mustChangePassword)return <section className="accountGate card"><h1>Create your private password first.</h1><Link href="/account/change-password?next=/commissioner/recap">Change password</Link></section>;if(account.role!=="commissioner")return <section className="accountGate card"><h1>Commissioner access only.</h1><Link href="/weekly-recap">Read the recap</Link></section>;return <CommissionerRecapEditor/>}
