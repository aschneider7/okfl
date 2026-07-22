"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import type {CalendarCategory,LeagueCalendarEvent} from "@/lib/leagueCalendar";

const labels:Record<CalendarCategory,string>={league:"League",keeper:"Keepers",draft:"Draft",matchup:"Matchups",waiver:"Waivers",trade:"Trades",vote:"Votes",social:"Social"};
const dayKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const eventDay=(event:LeagueCalendarEvent)=>dayKey(new Date(event.startsAt));
const dateLabel=(event:LeagueCalendarEvent)=>new Date(event.startsAt).toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",...(event.allDay?{}:{hour:"numeric",minute:"2-digit"})});

function downloadIcs(event:LeagueCalendarEvent){
  const stamp=(value:string)=>new Date(value).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
  const escape=(value:string)=>value.replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
  const start=stamp(event.startsAt),end=stamp(event.endsAt||new Date(Date.parse(event.startsAt)+60*60*1000).toISOString());
  const ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//OKFL//League Calendar//EN","BEGIN:VEVENT",`UID:${event.id}@okfl`, `DTSTAMP:${stamp(new Date().toISOString())}`,`DTSTART:${start}`,`DTEND:${end}`,`SUMMARY:${escape(event.title)}`,`DESCRIPTION:${escape(event.description)}`,"URL:https://okfl-iota.vercel.app/calendar","END:VEVENT","END:VCALENDAR"].join("\r\n");
  const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([ics],{type:"text/calendar"}));link.download=`okfl-${event.title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}.ics`;link.click();URL.revokeObjectURL(link.href);
}

export function LeagueCalendar(){
  const [events,setEvents]=useState<LeagueCalendarEvent[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState(""),[category,setCategory]=useState<CalendarCategory|"all">("all"),[month,setMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));
  useEffect(()=>{fetch("/api/league-calendar",{cache:"no-store"}).then(async response=>({ok:response.ok,body:await response.json()})).then(({ok,body})=>{if(ok){setEvents(body.events||[]);if(body.migrationRequired)setMessage("The managed calendar is waiting for its one-time database setup.")}else setMessage(body.error||"Calendar unavailable.")}).catch(()=>setMessage("Calendar unavailable.")).finally(()=>setLoading(false))},[]);
  const filtered=useMemo(()=>events.filter(event=>category==="all"||event.category===category),[events,category]);
  const byDay=useMemo(()=>{const map=new Map<string,LeagueCalendarEvent[]>();for(const event of filtered)map.set(eventDay(event),[...(map.get(eventDay(event))||[]),event]);return map},[filtered]);
  const days=useMemo(()=>{const first=new Date(month.getFullYear(),month.getMonth(),1),start=new Date(first);start.setDate(start.getDate()-start.getDay());return Array.from({length:42},(_,index)=>{const date=new Date(start);date.setDate(start.getDate()+index);return date})},[month]);
  const upcoming=filtered.filter(event=>Date.parse(event.startsAt)>=Date.now()-12*60*60*1000).slice(0,8),today=dayKey(new Date());
  if(loading)return <div className="card loadingCard"><span/>Loading the league calendar…</div>;
  return <div className="calendarPage">
    <section className="calendarHero"><div><span className="eyebrow">2026 league operations</span><h2>Every deadline.<br/>One league clock.</h2><p>Drafts, keepers, votes, waivers, matchups, and league events—organized in one shared schedule.</p></div><div className="calendarNext"><span>Next on the calendar</span>{upcoming[0]?<><b>{upcoming[0].title}</b><time>{dateLabel(upcoming[0])}</time></>:<><b>Schedule clear</b><time>No upcoming events</time></>}</div></section>
    {message&&<div className="calendarMessage">{message}</div>}
    <nav className="calendarFilters" aria-label="Calendar categories"><button className={category==="all"?"active":""} onClick={()=>setCategory("all")}>All events <b>{events.length}</b></button>{(Object.keys(labels) as CalendarCategory[]).map(key=><button key={key} className={category===key?`active ${key}`:key} onClick={()=>setCategory(key)}>{labels[key]} <b>{events.filter(event=>event.category===key).length}</b></button>)}</nav>
    <div className="calendarLayout"><section className="monthCalendar"><header><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))} aria-label="Previous month">←</button><div><span>League calendar</span><h2>{month.toLocaleString("en-US",{month:"long",year:"numeric"})}</h2></div><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))} aria-label="Next month">→</button></header><div className="calendarWeekdays">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day=><span key={day}>{day}</span>)}</div><div className="calendarGrid">{days.map(date=>{const key=dayKey(date),items=byDay.get(key)||[];return <article key={key} className={`${date.getMonth()===month.getMonth()?"":"outside"} ${key===today?"today":""}`}><time>{date.getDate()}</time><div>{items.slice(0,3).map(event=><Link key={event.id} href={event.href||`/calendar#event-${event.id}`} className={event.category} title={event.title}><i/>{event.title}</Link>)}{items.length>3&&<small>+{items.length-3} more</small>}</div></article>})}</div></section>
      <aside className="calendarAgenda"><header><span>Upcoming</span><h2>League agenda</h2></header>{upcoming.map(event=><article id={`event-${event.id}`} key={event.id} className={event.category}><div className="agendaDate"><b>{new Date(event.startsAt).getDate()}</b><span>{new Date(event.startsAt).toLocaleString("en-US",{month:"short"})}</span></div><div><span>{labels[event.category]}</span><h3>{event.title}</h3><time>{dateLabel(event)}</time>{event.description&&<p>{event.description}</p>}<footer>{event.href&&<Link href={event.href}>Open details</Link>}<button onClick={()=>downloadIcs(event)}>Add to calendar</button></footer></div></article>)}{!upcoming.length&&<div className="calendarEmpty"><b>No upcoming events</b><p>The Commissioner can publish the next league date from Calendar Controls.</p></div>}</aside>
    </div>
  </div>;
}
