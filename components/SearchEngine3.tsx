"use client";
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useData} from '@/components/DataProvider';
import {answerQuery,suggestions,SearchResult} from '@/lib/searchEngine';

const examples=['who owned Puka','Shnoods vs Isaac','most traded players','highest scoring week','2024 season','Sean championships','CMC 2024 Week 11 PPR points'];
export function SearchEngine3(){
 const {data}=useData();const params=useSearchParams();const [query,setQuery]=useState(params.get('q')||'');const [focus,setFocus]=useState(false);const [active,setActive]=useState(0);const input=useRef<HTMLInputElement>(null);
 const rows=useMemo(()=>data?suggestions(data,query):[],[data,query]);const answer=useMemo(()=>data?answerQuery(data,query):null,[data,query]);
 const liveIntent=useMemo(()=>query.match(/^(.+?)\s+(20\d{2})\s+(?:week|wk)\s*(\d{1,2})(?:\s+(half[- ]?ppr|standard|ppr))?(?:\s+(?:fantasy\s+)?points?)?$/i),[query]);
 const [live,setLive]=useState<any>(null),[loading,setLoading]=useState(false),[liveError,setLiveError]=useState('');
 useEffect(()=>{setActive(0)},[query]);
 useEffect(()=>{if(!liveIntent){setLive(null);setLiveError('');return}const timer=setTimeout(async()=>{setLoading(true);setLiveError('');try{const mode=(liveIntent[4]||'ppr').toLowerCase().replace(' ','-');const url=new URLSearchParams({player:liveIntent[1],season:liveIntent[2],week:liveIntent[3],scoring:mode});const response=await fetch(`/api/nfl/player-week?${url}`);const body=await response.json();if(!response.ok)throw new Error(body.error||'Lookup failed');setLive(body)}catch(e){setLive(null);setLiveError(e instanceof Error?e.message:String(e))}finally{setLoading(false)}},350);return()=>clearTimeout(timer)},[query,liveIntent?.[0]]);
 function choose(row:SearchResult){if(row.href)location.href=row.href;else setQuery(row.title)}
 function key(event:React.KeyboardEvent){if(event.key==='ArrowDown'){event.preventDefault();setActive(v=>(v+1)%Math.max(1,rows.length))}if(event.key==='ArrowUp'){event.preventDefault();setActive(v=>(v-1+Math.max(1,rows.length))%Math.max(1,rows.length))}if(event.key==='Enter'&&rows[active]){event.preventDefault();choose(rows[active])}if(event.key==='Escape'){setFocus(false);input.current?.blur()}}
 if(!data)return <div className="search3Loading">Building the OKFL knowledge index…</div>;
 return <div className="search3Page">
  <section className="search3Hero">
   <div className="search3Copy"><span className="search3Eyebrow"><i/> OKFL Knowledge Engine 3.0</span><h1>One search bar.<br/><em>Every answer.</em></h1><p>Ask about players, owners, drafts, trades, rivalries, seasons, records, rules—or pull a live NFL fantasy score from the internet.</p></div>
   <div className="search3Console">
    <div className="search3Input"><span>⌕</span><input ref={input} value={query} onChange={e=>setQuery(e.target.value)} onFocus={()=>setFocus(true)} onBlur={()=>setTimeout(()=>setFocus(false),150)} onKeyDown={key} placeholder="Ask OKFL anything…"/><kbd>↵</kbd></div>
    {focus&&query.length>=2&&rows.length>0&&<div className="search3Suggest">{rows.slice(0,9).map((row,index)=><button className={active===index?'active':''} key={row.id} onMouseDown={e=>e.preventDefault()} onMouseEnter={()=>setActive(index)} onClick={()=>choose(row)}><i>{row.icon}</i><span><b>{row.title}</b><small>{row.group} • {row.detail}</small></span><em>→</em></button>)}</div>}
    <div className="search3Examples">{examples.map(x=><button key={x} onClick={()=>{setQuery(x);input.current?.focus()}}>{x}</button>)}</div>
   </div>
  </section>
  <section className="search3Workspace">
   <div className="search3Answer">
    {!query&&<div className="search3Welcome"><span>03</span><h2>Start with a name, question, or record.</h2><p>The engine searches the private OKFL archive first, then uses the live NFL endpoint when the query asks for a weekly fantasy score.</p><div className="welcomeGrid"><article><b>League memory</b><p>Players, ownership, drafts, trades, keepers and results.</p></article><article><b>Instant answers</b><p>Head-to-head, leaders, records, seasons and franchise résumés.</p></article><article><b>Internet layer</b><p>Weekly NFL fantasy points without pre-saving every stat.</p></article></div></div>}
    {loading&&<div className="answerLoading"><i/><span>Fetching the live NFL stat line…</span></div>}
    {liveError&&<div className="answerError"><b>Live lookup failed</b><p>{liveError}</p></div>}
    {live&&<article className="zeroAnswer liveAnswer"><header><div><span>Internet-backed NFL answer</span><h2>{live.player}</h2><p>{live.season} Week {live.week} • {live.team}{live.opponent?` vs ${live.opponent}`:''} • {String(live.scoring).toUpperCase()}</p></div><div className="answerHero"><b>{Number(live.fantasyPoints).toFixed(2)}</b><small>Fantasy points</small></div></header><div className="answerStats"><div><b>{live.stats.rushingYards}</b><small>Rush yds</small></div><div><b>{live.stats.receptions}</b><small>Receptions</small></div><div><b>{live.stats.receivingYards}</b><small>Rec yds</small></div><div><b>{live.stats.rushingTds+live.stats.receivingTds}</b><small>TDs</small></div></div><footer><span>Source: nflverse weekly player statistics</span><a href={live.sourceUrl} target="_blank">Open source ↗</a></footer></article>}
    {!live&&answer&&<article className="zeroAnswer"><header><div><span>{answer.eyebrow}</span><h2>{answer.title}</h2><p>{answer.summary}</p></div>{answer.heroValue&&<div className="answerHero"><b>{answer.heroValue}</b><small>{answer.heroLabel}</small></div>}</header>{answer.stats&&<div className="answerStats">{answer.stats.map(stat=><div key={stat.label}><b>{stat.value}</b><small>{stat.label}</small></div>)}</div>}{answer.timeline&&<div className="answerTimeline">{answer.timeline.map((item,index)=><div key={`${item.year}-${index}`}><span>{item.year}</span><b>{item.label}</b><small>{item.detail}</small></div>)}</div>}{answer.href&&<footer><span>Answer generated from the verified OKFL archive.</span><Link href={answer.href}>{answer.hrefLabel||'Explore'} →</Link></footer>}</article>}
    {query&&!answer&&!live&&!loading&&!liveError&&<div className="noAnswer"><span>⌕</span><h2>No zero-click answer yet.</h2><p>Choose a predictive result or try “who owned…”, “who drafted…”, “A vs B”, “most traded players”, “highest scoring week”, a season, franchise, or player.</p></div>}
   </div>
   <aside className="search3Rail"><div className="railHead"><span>Predictive results</span><b>{query?rows.length:'Ready'}</b></div>{query?rows.slice(0,8).map(row=><Link href={row.href||`/?q=${encodeURIComponent(row.title)}`} key={row.id}><i>{row.icon}</i><div><b>{row.title}</b><small>{row.group} • {row.detail}</small>{row.preview&&<span>{row.preview.map(x=><em key={x.label}>{x.label} <strong>{x.value}</strong></em>)}</span>}</div><strong>↗</strong></Link>):<div className="railEmpty"><b>Try a command</b><code>/</code><code>Ctrl K</code><p>Search is also available globally from every page.</p></div>}</aside>
  </section>
 </div>
}