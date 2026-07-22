"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {Page} from "@/components/Page";
import {useAuth} from "@/components/AuthProvider";

type BallotOption={id:string;label:string;votes:number};
type LeagueCommunication={
  id:string;
  kind:"announcement"|"poll";
  title:string;
  body:string;
  status:string;
  closes_at:string|null;
  created_at:string;
  isOpen:boolean;
  myVote:string|null;
  totalVotes:number;
  eligibleCount:number;
  results:BallotOption[];
};
type FeedView="open"|"all"|"results"|"announcements";

const dateLabel=(value:string)=>new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value));

export default function LeagueVotesPage(){
  const {account,loading:authLoading,authFetch}=useAuth();
  const [items,setItems]=useState<LeagueCommunication[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[message,setMessage]=useState(""),[view,setView]=useState<FeedView>("open");
  async function load(){const response=await authFetch("/api/league-communications",{cache:"no-store"});const result=await response.json();if(response.ok)setItems(result.communications||[]);else setMessage(result.error||"League messages could not be loaded.");setLoading(false);}
  useEffect(()=>{if(account&&!account.mustChangePassword)void load();else if(!authLoading)setLoading(false)},[account,authLoading]);
  async function vote(communicationId:string,optionId:string){setBusy(communicationId);setMessage("");const response=await authFetch("/api/league-communications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({communicationId,optionId})});const result=await response.json();setBusy("");if(!response.ok){setMessage(result.error||"Vote could not be saved.");return}setMessage("Your franchise vote is recorded. You can change it until the ballot closes.");await load();}
  const openBallots=useMemo(()=>items.filter((item)=>item.kind==="poll"&&item.isOpen),[items]);
  const needsVote=useMemo(()=>openBallots.filter((item)=>!item.myVote),[openBallots]);
  const completedBallots=useMemo(()=>items.filter((item)=>item.kind==="poll"&&!item.isOpen),[items]);
  const filteredItems=useMemo(()=>{
    const filtered=view==="open"?openBallots:view==="results"?completedBallots:view==="announcements"?items.filter((item)=>item.kind==="announcement"):items;
    return [...filtered].sort((a,b)=>Number(b.isOpen)-Number(a.isOpen)||new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
  },[items,openBallots,completedBallots,view]);
  if(authLoading||loading)return <Page title="League Votes" subtitle="Loading the authenticated OKFL communications desk."><div className="leagueCommsLoading">Opening your franchise ballot…</div></Page>;
  if(!account)return <Page title="League Votes" subtitle="Announcements and ballots are private to authenticated OKFL managers."><section className="leagueCommsGate"><span>Manager access</span><h2>Sign in to open your franchise inbox.</h2><Link href="/login?next=/league-votes">Manager sign in</Link></section></Page>;
  return <Page title="League Votes" subtitle={`Official announcements and one-franchise-one-vote ballots for ${account.franchiseName}.`}>
    <section className="leagueCommsHero">
      <div><span className="eyebrow">Official league record</span><h2>Your franchise has one voice.</h2><p>Review the Commissioner’s context, make your selection, and change it any time before the ballot closes.</p></div>
      <div className="leagueVoteScoreboard"><article className={needsVote.length?"attention":"complete"}><b>{needsVote.length}</b><span>need your vote</span></article><article><b>{openBallots.length}</b><span>open now</span></article><article><b>{completedBallots.length}</b><span>final results</span></article></div>
    </section>
    {needsVote.length>0&&<aside className="leagueVoteCallout"><span>{needsVote.length===1?"Ballot waiting":"Ballots waiting"}</span><p>{needsVote.length===1?`“${needsVote[0].title}” is ready for your franchise vote.`:`Your franchise has ${needsVote.length} open decisions to make.`}</p><button type="button" onClick={()=>{setView("open");window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>document.getElementById(`message-${needsVote[0].id}`)?.scrollIntoView({behavior:"smooth",block:"start"})))}}>Vote now ↓</button></aside>}
    {message&&<div className="leagueCommsMessage" role="status" aria-live="polite">{message}</div>}
    <nav className="leagueCommsFilters" aria-label="Filter league communications">
      <button type="button" className={view==="open"?"active":""} onClick={()=>setView("open")}><span>Open ballots</span><b>{openBallots.length}</b></button>
      <button type="button" className={view==="all"?"active":""} onClick={()=>setView("all")}><span>All activity</span><b>{items.length}</b></button>
      <button type="button" className={view==="results"?"active":""} onClick={()=>setView("results")}><span>Final results</span><b>{completedBallots.length}</b></button>
      <button type="button" className={view==="announcements"?"active":""} onClick={()=>setView("announcements")}><span>Announcements</span><b>{items.filter((item)=>item.kind==="announcement").length}</b></button>
    </nav>
    <section className="leagueCommsFeed">
      {filteredItems.map((item)=>{
        const participation=item.eligibleCount?Math.round(item.totalVotes/item.eligibleCount*100):0;
        return <article id={`message-${item.id}`} key={item.id} className={`${item.kind} ${item.isOpen?"isOpen":"isFinal"} ${item.myVote?"hasVote":""}`}>
          <header><span>{item.kind==="poll"?"League vote":"Commissioner announcement"}</span><time>{dateLabel(item.created_at)}</time>{item.kind==="poll"&&<i className={item.isOpen?"open":"closed"}>{item.isOpen?(item.myVote?"Vote recorded":"Action needed"):"Final result"}</i>}</header>
          <div className="leagueCommsBody"><h2>{item.title}</h2>{item.body&&<p>{item.body}</p>}</div>
          {item.kind==="poll"&&<div className="leagueBallot">
            <div className="leagueBallotMeta"><div><span>{item.isOpen?"Choose one":"Voting complete"}</span><b>{item.myVote?"Your franchise has voted. Your current selection is marked below.":item.isOpen?"Your franchise has not voted yet.":"Final league totals."}</b></div>{item.closes_at&&<time>{item.isOpen?"Closes":"Closed by"} {dateLabel(item.closes_at)}</time>}</div>
            <div className="leagueBallotChoices">{item.results.map((option)=>{const selected=item.myVote===option.id,percent=item.totalVotes?Math.round(option.votes/item.totalVotes*100):0;return <button key={option.id} className={selected?"selected":""} disabled={!item.isOpen||busy===item.id} onClick={()=>vote(item.id,option.id)} aria-pressed={selected}><span className="leagueChoiceMark">{selected?"✓":""}</span><span className="leagueChoiceLabel">{option.label}<small>{selected?"Your vote":item.isOpen?"Select this option":"Final result"}</small></span><b>{option.votes}<small>{percent}%</small></b><em style={{width:`${percent}%`}}/></button>})}</div>
            <footer><div><span>League participation</span><b>{item.totalVotes} of {item.eligibleCount||10} franchises</b></div><i><em style={{width:`${participation}%`}}/></i><strong>{participation}%</strong></footer>
          </div>}
        </article>;
      })}
      {!filteredItems.length&&<div className="leagueCommsEmpty"><span>{view==="open"?"You’re caught up":"All quiet"}</span><h2>{view==="open"?"No open ballots need attention.":"Nothing in this section yet."}</h2><p>{view==="open"?"New league votes will appear here and in your My Franchise inbox.":"Commissioner activity will appear here when it is published."}</p>{view==="open"&&items.length>0&&<button type="button" onClick={()=>setView("all")}>View all league activity</button>}</div>}
    </section>
  </Page>;
}
