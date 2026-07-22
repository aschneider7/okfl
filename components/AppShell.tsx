"use client";

import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useEffect,useState} from "react";
import {CommandPalette} from "@/components/CommandPalette";
import {useAuth} from "@/components/AuthProvider";

type NavItem = readonly [href: string, label: string, glyph: string];
type NavGroup = {label: string; links: readonly NavItem[]};

const navGroups: readonly NavGroup[] = [
  {label:"Now",links:[["/","Home","01"],["/account","My Franchise","MF"],["/calendar","League Calendar","CL"],["/league-votes","League Votes","LV"],["/live-league","Live Dashboard","02"],["/weekly-recap","Weekly Recap","03"],["/league-awards","Awards Race","04"],["/playoff-odds","Playoff Odds","05"],["/power-rankings","Power Rankings","06"]]},
  {label:"League lab",links:[["/clinching-scenarios","Clinching Paths","CP"],["/luck-index","Luck Index","LI"],["/player-ownership","Player Genealogy","PG"],["/waiver-hall","Waiver Hall","WH"]]},
  {label:"Front office",links:[["/franchises","Franchises","07"],["/compare","Compare","08"],["/trades","Trade Center","09"],["/keepers","Keepers","10"]]},
  {label:"Draft",links:[["/mock-draft","Draft Room","11"],["/live-draft","Live Draft","12"],["/drafts","Draft History","13"]]},
  {label:"Archive",links:[["/records","Record Book","14"],["/time-machine","Time Machine","15"],["/rules","Rulebook","16"]]},
];
const commissionerGroup:NavGroup={label:"Commissioner",links:[["/commissioner","Control Center","CO"],["/commissioner/calendar","Calendar Controls","CC"],["/commissioner/settings","League Settings","ST"]]};
const links=[...navGroups,commissionerGroup].flatMap((group)=>group.links);
const mobileLinks = links.filter(([href]) => ["/", "/calendar", "/live-league", "/playoff-odds", "/live-draft"].includes(href));
const matchesPath=(path:string,href:string)=>path===href||(href!=="/"&&href!=="/commissioner"&&path.startsWith(`${href}/`));

export function AppShell({children}: {children: React.ReactNode}) {
  const path = usePathname(); const [open, setOpen] = useState(false); const [navigating,setNavigating]=useState(false);const [leagueNotice,setLeagueNotice]=useState<{noticeActive:boolean;noticeTitle:string;noticeBody:string;noticeHref:string}|null>(null);
  const router=useRouter();const {account,loading:authLoading}=useAuth();
  const [openGroups,setOpenGroups]=useState<Record<string,boolean>>(()=>({Now:true}));
  useEffect(()=>{
    setNavigating(false);setOpen(false);
    const activeGroup=[...navGroups,commissionerGroup].find((group)=>group.links.some(([href])=>matchesPath(path,href)));
    if(activeGroup)setOpenGroups((current)=>({...current,[activeGroup.label]:true}));
  },[path]);
  useEffect(()=>{if(account?.mustChangePassword&&path!=="/account/change-password"&&path!=="/login")router.replace(`/account/change-password?next=${encodeURIComponent(path)}`)},[account,path,router]);
  useEffect(()=>{let active=true;const loadNotice=()=>fetch("/api/league-settings",{cache:"no-store"}).then((response)=>response.json()).then((body)=>{if(active)setLeagueNotice(body.settings||null)}).catch(()=>{});const update=(event:Event)=>{if(active)setLeagueNotice((event as CustomEvent).detail||null)};void loadNotice();window.addEventListener("okfl:settings-updated",update);return()=>{active=false;window.removeEventListener("okfl:settings-updated",update)}},[path]);
  const beginNavigation=(href:string)=>{if(href!==path)setNavigating(true)};
  const toggleGroup=(label:string)=>setOpenGroups((current)=>({...current,[label]:!current[label]}));
  const current = links.find(([href]) => matchesPath(path,href))?.[1] || "League workspace";
  const visibleGroups=account?.role==="commissioner"?[...navGroups,commissionerGroup]:navGroups;
  return <div className="shell">
    <aside className={open ? "sidebar open" : "sidebar"}>
      <Link href="/" className="brand" onClick={()=>beginNavigation("/")}><div className="brandMark"><img src="/okfl-logo.png" alt="" /></div><div className="brandCopy"><small>Obama Keeper Fantasy League</small><b>OKFL OS</b><span>League intelligence</span></div></Link>
      <nav>{visibleGroups.map((group)=>{const expanded=Boolean(openGroups[group.label]);const menuId=`nav-${group.label.toLowerCase().replaceAll(" ","-")}`;return <section className="navGroup" key={group.label}><button type="button" className={expanded?"navGroupToggle open":"navGroupToggle"} onClick={()=>toggleGroup(group.label)} aria-expanded={expanded} aria-controls={menuId}><span>{group.label}</span><i aria-hidden="true"/></button><div id={menuId} className={expanded?"navGroupMenu open":"navGroupMenu"} aria-hidden={!expanded}><div>{group.links.map(([href,label,glyph])=>{const active=matchesPath(path,href);return <Link key={href} href={href} onClick={()=>beginNavigation(href)} className={active?"active":""}><i>{glyph}</i><span>{label}</span><em/></Link>})}</div></div></section>})}</nav>
      <div className="sidebarStatus"><span><i /></span><div><b>Archive online</b><small>2021–2025 verified · 2026 live</small></div></div>
    </aside>
    <header className="mobileHeader"><button onClick={() => setOpen(!open)} aria-label="Open navigation" aria-expanded={open}><span /><span /><span /></button><div className="mobileBrand"><img src="/okfl-logo.png" alt=""/><span><b>OKFL OS</b><small>{current}</small></span></div><div className="mobileUtilities"><Link className="mobileAccount" href={account?"/account":"/login"} aria-label={account?`${account.displayName} account`:"Manager sign in"}>{account?.displayName?.slice(0,1)||"ID"}</Link><CommandPalette /></div></header>
    <div className={navigating?"navProgress active":"navProgress"} aria-hidden="true"><i/></div>
    <main className="main"><div className="topbar"><div className="topbarContext"><span>League intelligence</span><b>{current}</b></div><div className="topbarActions"><span className="seasonChip"><i />2026 season</span><Link href={account?"/account":"/login"} className={account?.mustChangePassword?"accountChip action":"accountChip"}><i>{account?.displayName?.slice(0,1)||"ID"}</i><span><b>{authLoading?"Checking…":account?.displayName||"Manager sign in"}</b><small>{account?.mustChangePassword?"Change password":account?.franchiseName||"League account"}</small></span></Link><CommandPalette /></div></div>{leagueNotice?.noticeActive&&<div className="leagueNotice"><div><span>League notice</span><b>{leagueNotice.noticeTitle}</b><p>{leagueNotice.noticeBody}</p></div>{leagueNotice.noticeHref&&<Link href={leagueNotice.noticeHref}>Open</Link>}</div>}<div className="routeStage" key={path}>{children}</div></main>
    <nav className="mobileDock" aria-label="Primary mobile navigation">{mobileLinks.map(([href, label, glyph]) => { const active = path === href || (href !== "/" && path.startsWith(href)); return <Link key={href} href={href} onClick={()=>beginNavigation(href)} className={active ? "active" : ""}><i>{glyph}</i><span>{label === "Live Draft" ? "Draft" : label === "Live Dashboard" ? "Live" : label === "Weekly Recap" ? "Recap" : label === "Playoff Odds" ? "Odds" : label}</span></Link>; })}</nav>
    {open && <button className="backdrop" onClick={() => setOpen(false)} aria-label="Close menu" />}
  </div>;
}
