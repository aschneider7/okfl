"use client";

import Link from "next/link";
import {CommissionerCalendar} from "@/components/CommissionerCalendar";
import {useAuth} from "@/components/AuthProvider";

export default function CommissionerCalendarPage(){const {session,account,loading}=useAuth();if(loading)return <div className="card loadingCard"><span/>Checking Commissioner access…</div>;if(!session||!account)return <section className="accountGate card"><span className="eyebrow">Calendar controls</span><h1>Commissioner sign-in required.</h1><Link href="/login?next=/commissioner/calendar">Commissioner sign in</Link></section>;if(account.mustChangePassword)return <section className="accountGate card"><h1>Create your private password first.</h1><Link href="/account/change-password?next=/commissioner/calendar">Change password</Link></section>;if(account.role!=="commissioner")return <section className="accountGate card"><h1>Commissioner access only.</h1><Link href="/calendar">View league calendar</Link></section>;return <CommissionerCalendar/>}
