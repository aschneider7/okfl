"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {useData} from "@/components/DataProvider";

type Item={id:string;group:string;title:string;detail:string;href:string;keywords:string;score?:number};

function norm(value:string){
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
}

function score(candidate:string,query:string){
  const c=norm(candidate),q=norm(query);
  if(!q)return 1;
  if(c===q)return 100;
  if(c.startsWith(q))return 88;
  if(c.includes(q))return 68-Math.min(20,c.indexOf(q));
  const tokens=q.split(" ");
  const matches=tokens.filter((token)=>c.split(" ").some((word)=>word.startsWith(token)||token.startsWith(word))).length;
  return matches*22;
}

export function CommandPalette(){
  const {data}=useData();
  const router=useRouter();
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const [active,setActive]=useState(0);
  const input=useRef<HTMLInputElement>(null);

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){
        event.preventDefault();setOpen(true);
      }else if(event.key==="/"&&!open&&!(event.target instanceof HTMLInputElement)&&!(event.target instanceof HTMLTextAreaElement)){
        event.preventDefault();setOpen(true);
      }else if(event.key==="Escape"&&open)setOpen(false);
    };
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[open]);

  useEffect(()=>{if(open)window.setTimeout(()=>input.current?.focus(),20)},[open]);
  useEffect(()=>setActive(0),[query]);

  const items=useMemo<Item[]>(()=>{
    if(!data)return[];
    const rows:Item[]=[
      {id:"records",group:"Quick actions",title:"Open Records Center",detail:"Championships, PF, PA, weekly records and legacy",href:"/records",keywords:"records championships highest score legacy"},
      {id:"trades",group:"Quick actions",title:"Explore every trade",detail:"Filter all completed deals from 2021 onward",href:"/trades",keywords:"trades deals fleece"},
      {id:"drafts",group:"Quick actions",title:"Open Draft Center",detail:"Draft boards, grades and historical pick value",href:"/drafts",keywords:"draft picks grades rounds"},
      {id:"keepers",group:"Quick actions",title:"Open Keeper Center",detail:"Keeper history, cost and eligibility",href:"/keepers",keywords:"keepers kept cost"},
      {id:"compare",group:"Quick actions",title:"Compare two franchises",detail:"Head-to-head and career comparison",href:"/compare",keywords:"compare versus vs franchise"},
      {id:"timemachine",group:"Quick actions",title:"Open Time Machine",detail:"Browse the league by historical season",href:"/time-machine",keywords:"season history time machine"},
    ];

    data.franchises.forEach((franchise:any)=>{
      rows.push({
        id:`franchise-${franchise.id}`,group:"Franchises",title:franchise.name,
        detail:`${franchise.current_manager} • Full scouting report`,
        href:`/franchises/${franchise.id}`,
        keywords:`${franchise.name} ${franchise.display_name} ${franchise.current_manager} ${franchise.original_manager}`
      });
    });

    data.players.slice(0,2000).forEach((player:any)=>{
      rows.push({
        id:`player-${player.name}`,group:"Players",title:player.name,
        detail:`${(player.positions||[]).join("/")||"Player"} • ${(player.rostered_seasons||[]).join(", ")||"OKFL history"}`,
        href:`/?q=${encodeURIComponent(player.name)}`,
        keywords:`${player.name} ${(player.positions||[]).join(" ")} ${(player.nfl_teams||[]).join(" ")}`
      });
    });

    [2021,2022,2023,2024,2025,2026].forEach((year)=>{
      rows.push({id:`season-${year}`,group:"Seasons",title:`${year} OKFL Season`,detail:"Standings, trades, drafts and history",href:`/time-machine?year=${year}`,keywords:`${year} season standings playoffs`});
    });

    return rows;
  },[data]);

  const results=useMemo(()=>{
    const q=norm(query);
    return items.map((item)=>({...item,score:score(`${item.title} ${item.keywords}`,q)}))
      .filter((item)=>(item.score??0)>=(q?22:1))
      .sort((a,b)=>(b.score??0)-(a.score??0)||a.title.localeCompare(b.title))
      .slice(0,18);
  },[items,query]);

  function choose(item:Item){
    setOpen(false);setQuery("");router.push(item.href);
  }

  function keyDown(event:React.KeyboardEvent<HTMLInputElement>){
    if(event.key==="ArrowDown"){event.preventDefault();setActive((value)=>(value+1)%Math.max(1,results.length))}
    if(event.key==="ArrowUp"){event.preventDefault();setActive((value)=>(value-1+Math.max(1,results.length))%Math.max(1,results.length))}
    if(event.key==="Enter"&&results[active]){event.preventDefault();choose(results[active])}
  }

  const grouped=results.reduce((groups:Record<string,Item[]>,item)=>{
    (groups[item.group]??=[]).push(item);return groups;
  },{});

  return <>
    <button className="globalSearchTrigger" onClick={()=>setOpen(true)}>
      <span>⌕</span><b>Search anything</b><kbd>⌘ K</kbd>
    </button>
    {open&&<div className="commandOverlay" onMouseDown={()=>setOpen(false)}>
      <div className="commandPalette" onMouseDown={(event)=>event.stopPropagation()}>
        <div className="commandInput">
          <span>⌕</span>
          <input ref={input} value={query} onChange={(event)=>setQuery(event.target.value)} onKeyDown={keyDown} placeholder="Players, franchises, seasons, trades, records…"/>
          <kbd>ESC</kbd>
        </div>
        <div className="commandResults">
          {Object.entries(grouped).map(([group,rows])=><section key={group}>
            <h3>{group}</h3>
            {rows.map((item)=>{
              const index=results.findIndex((row)=>row.id===item.id);
              return <button className={index===active?"active":""} key={item.id} onMouseEnter={()=>setActive(index)} onClick={()=>choose(item)}>
                <span><b>{item.title}</b><small>{item.detail}</small></span><em>↵</em>
              </button>
            })}
          </section>)}
          {!results.length&&<div className="commandEmpty">No matching OKFL record yet.</div>}
        </div>
        <footer><span>↑↓ Navigate</span><span>↵ Open</span><span>/ Search anywhere</span></footer>
      </div>
    </div>}
  </>;
}
