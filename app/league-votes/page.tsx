"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {Page} from "@/components/Page";
import {useAuth} from "@/components/AuthProvider";

export default function LeagueVotesPage(){
  const {account,loading:authLoading,authFetch}=useAuth();const [items,setItems]=useState<any[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[message,setMessage]=useState("");
  async function load(){const response=await authFetch("/api/league-communications",{cache:"no-store"});const result=await response.json();if(response.ok)setItems(result.communications||[]);else setMessage(result.error||"League messages could not be loaded.");setLoading(false);}
  useEffect(()=>{if(account&&!account.mustChangePassword)void load();else if(!authLoading)setLoading(false)},[account,authLoading]);
  async function vote(communicationId:string,optionId:string){setBusy(communicationId);setMessage("");const response=await authFetch("/api/league-communications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({communicationId,optionId})});const result=await response.json();setBusy("");if(!response.ok){setMessage(result.error||"Vote could not be saved.");return}setMessage("Your franchise vote is recorded. You can change it until the ballot closes.");await load();}
  if(authLoading||loading)return <Page title="League Votes" subtitle="Loading the authenticated OKFL communications desk."><div className="leagueCommsLoading">Opening your franchise ballot…</div></Page>;
  if(!account)return <Page title="League Votes" subtitle="Announcements and ballots are private to authenticated OKFL managers."><section className="leagueCommsGate"><span>Manager access</span><h2>Sign in to open your franchise inbox.</h2><Link href="/login?next=/league-votes">Manager sign in</Link></section></Page>;
  return <Page title="League Votes" subtitle={`Official announcements and one-franchise-one-vote ballots for ${account.franchiseName}.`}>
    <section className="leagueCommsHero"><div><span className="eyebrow">Commissioner wire</span><h2>The league’s official record.</h2><p>Every ballot is tied to an authenticated franchise account. One current vote per team; selections can change until the Commissioner closes voting.</p></div><div><b>{items.filter((item)=>item.isOpen).length}</b><span>open ballots</span><small>{items.length} total messages</small></div></section>
    {message&&<div className="leagueCommsMessage" role="status">{message}</div>}
    <section className="leagueCommsFeed">{items.map((item)=><article id={`message-${item.id}`} key={item.id} className={item.kind}><header><span>{item.kind==="poll"?"League vote":"Announcement"}</span><time>{new Date(item.created_at).toLocaleString()}</time>{item.kind==="poll"&&<i className={item.isOpen?"open":"closed"}>{item.isOpen?"Voting open":"Final"}</i>}</header><h2>{item.title}</h2>{item.body&&<p>{item.body}</p>}{item.kind==="poll"&&<div className="leagueBallot">{item.results.map((option:any)=>{const selected=item.myVote===option.id,percent=item.totalVotes?Math.round(option.votes/item.totalVotes*100):0;return <button key={option.id} className={selected?"selected":""} disabled={!item.isOpen||busy===item.id} onClick={()=>vote(item.id,option.id)}><span><i/>{option.label}</span><b>{option.votes} vote{option.votes===1?"":"s"} · {percent}%</b><em style={{width:`${percent}%`}}/></button>})}<footer><span>{item.myVote?"Your franchise has voted":"Your franchise has not voted"}</span><b>{item.totalVotes} of 10 votes recorded</b>{item.closes_at&&<time>Closes {new Date(item.closes_at).toLocaleString()}</time>}</footer></div>}</article>)}{!items.length&&<div className="leagueCommsEmpty"><span>All quiet</span><h2>No commissioner announcements yet.</h2><p>New league notices and votes will appear here and in your My Franchise inbox.</p></div>}</section>
  </Page>;
}
