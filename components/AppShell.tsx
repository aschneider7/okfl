"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";
import {CommandPalette} from "@/components/CommandPalette";

type NavItem = readonly [href: string, label: string, glyph: string];
type NavGroup = {label: string; links: readonly NavItem[]};

const navGroups: readonly NavGroup[] = [
  {label:"Now",links:[["/","Home","01"],["/live-league","Live Dashboard","02"],["/weekly-recap","Weekly Recap","03"],["/league-awards","Awards Race","04"],["/playoff-odds","Playoff Odds","05"],["/power-rankings","Power Rankings","06"]]},
  {label:"Front office",links:[["/franchises","Franchises","07"],["/compare","Compare","08"],["/trades","Trade Center","09"],["/keepers","Keepers","10"]]},
  {label:"Draft",links:[["/mock-draft","Draft Room","11"],["/live-draft","Live Draft","12"],["/drafts","Draft History","13"]]},
  {label:"Archive",links:[["/records","Record Book","14"],["/time-machine","Time Machine","15"],["/rules","Rulebook","16"],["/commissioner","Commissioner","17"]]},
];
const links=navGroups.flatMap((group)=>group.links);
const mobileLinks = links.filter(([href]) => ["/", "/live-league", "/weekly-recap", "/playoff-odds", "/live-draft"].includes(href));

export function AppShell({children}: {children: React.ReactNode}) {
  const path = usePathname(); const [open, setOpen] = useState(false); const [navigating,setNavigating]=useState(false);
  useEffect(()=>{setNavigating(false);setOpen(false)},[path]);
  const beginNavigation=(href:string)=>{if(href!==path)setNavigating(true)};
  const current = links.find(([href]) => path === href || (href !== "/" && path.startsWith(href)))?.[1] || "League workspace";
  return <div className="shell">
    <aside className={open ? "sidebar open" : "sidebar"}>
      <Link href="/" className="brand" onClick={()=>beginNavigation("/")}><div className="brandMark"><img src="/okfl-logo.png" alt="" /></div><div className="brandCopy"><small>Obama Keeper Fantasy League</small><b>OKFL OS</b><span>League intelligence</span></div></Link>
      <nav>{navGroups.map((group)=><section className="navGroup" key={group.label}><span className="navGroupLabel">{group.label}</span>{group.links.map(([href,label,glyph])=>{const active=path===href||(href!=="/"&&path.startsWith(href));return <Link key={href} href={href} onClick={()=>beginNavigation(href)} className={active?"active":""}><i>{glyph}</i><span>{label}</span><em/></Link>})}</section>)}</nav>
      <div className="sidebarStatus"><span><i /></span><div><b>Archive online</b><small>2021–2025 verified · 2026 live</small></div></div>
    </aside>
    <header className="mobileHeader"><button onClick={() => setOpen(!open)} aria-label="Open navigation" aria-expanded={open}><span /><span /><span /></button><div className="mobileBrand"><img src="/okfl-logo.png" alt=""/><span><b>OKFL OS</b><small>{current}</small></span></div><CommandPalette /></header>
    <div className={navigating?"navProgress active":"navProgress"} aria-hidden="true"><i/></div>
    <main className="main"><div className="topbar"><div className="topbarContext"><span>League intelligence</span><b>{current}</b></div><div className="topbarActions"><span className="seasonChip"><i />2026 season</span><CommandPalette /></div></div><div className="routeStage" key={path}>{children}</div></main>
    <nav className="mobileDock" aria-label="Primary mobile navigation">{mobileLinks.map(([href, label, glyph]) => { const active = path === href || (href !== "/" && path.startsWith(href)); return <Link key={href} href={href} onClick={()=>beginNavigation(href)} className={active ? "active" : ""}><i>{glyph}</i><span>{label === "Live Draft" ? "Draft" : label === "Live Dashboard" ? "Live" : label === "Weekly Recap" ? "Recap" : label === "Playoff Odds" ? "Odds" : label}</span></Link>; })}</nav>
    {open && <button className="backdrop" onClick={() => setOpen(false)} aria-label="Close menu" />}
  </div>;
}
