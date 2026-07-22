"use client";

import {createContext,useCallback,useContext,useEffect,useMemo,useState} from "react";
import type {Session} from "@supabase/supabase-js";
import type {AccountProfile} from "@/lib/accountIdentity";
import {getSupabaseBrowserClient} from "@/lib/supabaseBrowser";

type AuthContextValue={
  session:Session|null;
  account:AccountProfile|null;
  loading:boolean;
  authFetch:(input:RequestInfo|URL,init?:RequestInit)=>Promise<Response>;
  refreshAccount:()=>Promise<AccountProfile|null>;
  signOut:()=>Promise<void>;
};

const AuthContext=createContext<AuthContextValue|null>(null);

export function AuthProvider({children}:{children:React.ReactNode}) {
  const [session,setSession]=useState<Session|null>(null);
  const [account,setAccount]=useState<AccountProfile|null>(null);
  const [loading,setLoading]=useState(true);

  const loadAccount=useCallback(async(current:Session|null)=>{
    if(!current){setAccount(null);return null}
    const response=await fetch("/api/auth/me",{cache:"no-store",headers:{Authorization:`Bearer ${current.access_token}`}});
    if(!response.ok){setAccount(null);return null}
    const body=await response.json() as AccountProfile;
    setAccount(body);
    return body;
  },[]);

  useEffect(()=>{
    const supabase=getSupabaseBrowserClient();
    if(!supabase){setLoading(false);return}
    let active=true;
    supabase.auth.getSession().then(async({data})=>{
      if(!active)return;
      setSession(data.session);
      await loadAccount(data.session);
      if(active)setLoading(false);
    });
    const {data:listener}=supabase.auth.onAuthStateChange((_event,nextSession)=>{
      if(!active)return;
      setSession(nextSession);
      window.setTimeout(()=>{void loadAccount(nextSession)},0);
    });
    return()=>{active=false;listener.subscription.unsubscribe()};
  },[loadAccount]);

  const authFetch=useCallback(async(input:RequestInfo|URL,init:RequestInit={})=>{
    const supabase=getSupabaseBrowserClient();
    const current=supabase?(await supabase.auth.getSession()).data.session:null;
    const headers=new Headers(init.headers);
    if(current)headers.set("Authorization",`Bearer ${current.access_token}`);
    return fetch(input,{...init,headers});
  },[]);

  const refreshAccount=useCallback(async()=>{
    const supabase=getSupabaseBrowserClient();
    const current=supabase?(await supabase.auth.getSession()).data.session:null;
    setSession(current);
    return loadAccount(current);
  },[loadAccount]);

  const signOut=useCallback(async()=>{
    const supabase=getSupabaseBrowserClient();
    if(supabase)await supabase.auth.signOut();
    setSession(null);setAccount(null);
  },[]);

  const value=useMemo(()=>({session,account,loading,authFetch,refreshAccount,signOut}),[session,account,loading,authFetch,refreshAccount,signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error("useAuth must be used inside AuthProvider");return value}
