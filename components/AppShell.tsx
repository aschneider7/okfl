"use client";

import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useEffect,useState} from "react";
import {CommandPalette} from "@/components/CommandPalette";
import {useAuth} from "@/components/AuthProvider";

type NavItem = readonly [href: string, label: string, glyph: string];
type NavGroup = {label: string; links: readonly NavItem[]};

const navGroups: readonly NavGroup[] = [
  {label:"Dashboard",links:[["/","Home","01"],["/account","My Franchise","MF"],["/calendar","League Calendar","CL"],["/league-votes","League Votes","LV"],["/live-league","Live Dashboard","02"],["/weekly-recap","Weekly Recap","03"],["/league-awards","Awards Race","04"],["/playoff-odds","Playoff Odds","05"],["/power-rankings","Power Rankings","06"]]},
  {label:"League Lab",links:[["/clinching-scenarios","Clinching Paths","CP"],["/luck-index","Luck Index","LI"],["/player-ownership","Player Genealogy","PG"],["/waiver-hall","Waiver Hall","WH"]]},
  {label:"Front Office",links:[["/franchises","Franchises","07"],["/compare","Compare","08"],["/trades","Trade Center","09"],["/trade-war-room","Deadline War Room","WR"],["/keepers","Keepers","10"]]},
  {label:"Draft",links:[["/mock-draft","Draft Room","11"],["/live-draft","Live Draft","12"],["/drafts","Draft History","13"]]},
  {label:"Archive",links:[["/records","Record Book","14"],["/time-machine","Time Machine","15"],["/rules","Rulebook","16"]]},
];

const commissionerGroup:NavGroup={label:"Commissioner",links:[["/commissioner","Control Center","CO"],["/commissioner/recap","Recap Studio","RC"],["/commissioner/calendar","Calendar Controls","CC"],["/commissioner/settings","League Settings","ST"]]};
const links=[...navGroups,commissionerGroup].flatMap((group)=>group.links);
const matchesPath=(path:string,href:string)=>path===href||(href!=="/"&&href!=="/commissioner"&&path.startsWith(`${href}/`));

const navDescriptions:Record<string,string>={
  "/":"League pulse and quick actions",
  "/account":"Your roster, matchup and activity",
  "/calendar":"Dates, deadlines and league events",
  "/league-votes":"Open polls and league decisions",
  "/live-league":"Scores, standings and live movement",
  "/weekly-recap":"The week in stories and numbers",
  "/league-awards":"Season-long award races",
  "/playoff-odds":"Simulated paths to the postseason",
  "/power-rankings":"Weekly team strength index",
  "/clinching-scenarios":"Every route to clinch or elimination",
  "/luck-index":"Schedule fortune and expected record",
  "/player-ownership":"Player history across the league",
  "/waiver-hall":"Best waiver finds and misses",
  "/franchises":"Scouting reports for every manager",
  "/compare":"Head-to-head franchise comparison",
  "/trades":"Model and evaluate transactions",
  "/trade-war-room":"Deadline needs, assets and targets",
  "/keepers":"Official keeper planning and submission",
  "/mock-draft":"League-calibrated mock draft simulator",
  "/live-draft":"Real-time multiplayer draft room",
  "/drafts":"Past draft boards and results",
  "/records":"League records and all-time leaders",
  "/time-machine":"Explore every completed season",
  "/rules":"Scoring, roster and keeper rules",
  "/commissioner":"Private league control center",
  "/commissioner/recap":"Write and publish the weekly story",
  "/commissioner/calendar":"Manage dates and reminders",
  "/commissioner/settings":"Access, branding and league settings",
};

export function AppShell({children}: {children: React.ReactNode}) {
  const path=usePathname();
  const router=useRouter();
  const {account,loading:authLoading}=useAuth();
  const [open,setOpen]=useState(false);
  const [desktopMenu,setDesktopMenu]=useState<string|null>(null);
  const [navigating,setNavigating]=useState(false);
  const [leagueNotice,setLeagueNotice]=useState<{noticeActive:boolean;noticeTitle:string;noticeBody:string;noticeHref:string}|null>(null);
  const [openGroups,setOpenGroups]=useState<Record<string,boolean>>(()=>({Dashboard:true}));

  const visibleGroups=account?.role==="commissioner"?[...navGroups,commissionerGroup]:navGroups;
  const current=links.find(([href])=>matchesPath(path,href))?.[1]||"League workspace";

  useEffect(()=>{
    setNavigating(false);
    setOpen(false);
    setDesktopMenu(null);
    const activeGroup=[...navGroups,commissionerGroup].find((group)=>group.links.some(([href])=>matchesPath(path,href)));
    if(activeGroup)setOpenGroups((currentGroups)=>({...currentGroups,[activeGroup.label]:true}));
  },[path]);

  useEffect(()=>{
    if(account?.mustChangePassword&&path!=="/account/change-password"&&path!=="/login"){
      router.replace(`/account/change-password?next=${encodeURIComponent(path)}`);
    }
  },[account,path,router]);

  useEffect(()=>{
    document.documentElement.classList.toggle("nav-open",open);
    return()=>document.documentElement.classList.remove("nav-open");
  },[open]);

  useEffect(()=>{
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setDesktopMenu(null);setOpen(false)}};
    window.addEventListener("keydown",closeOnEscape);
    return()=>window.removeEventListener("keydown",closeOnEscape);
  },[]);

  useEffect(()=>{
    let active=true;
    const loadNotice=()=>fetch("/api/league-settings",{cache:"no-store"}).then((response)=>response.json()).then((body)=>{if(active)setLeagueNotice(body.settings||null)}).catch(()=>{});
    const update=(event:Event)=>{if(active)setLeagueNotice((event as CustomEvent).detail||null)};
    void loadNotice();
    window.addEventListener("okfl:settings-updated",update);
    return()=>{active=false;window.removeEventListener("okfl:settings-updated",update)};
  },[path]);

  const beginNavigation=(href:string)=>{if(href!==path)setNavigating(true)};
  const toggleGroup=(label:string)=>setOpenGroups((currentGroups)=>({...currentGroups,[label]:!currentGroups[label]}));

  return <div className="shell v9Shell">
    <header className="desktopHeader">
      <div className="desktopHeaderInner">
        <Link href="/" className="desktopBrand" onClick={()=>beginNavigation("/")} aria-label="OKFL OS home">
          <span className="desktopBrandMark"><img src="/okfl-logo.png" alt="" /></span>
          <span><small>Obama Keeper Fantasy League</small><b>OKFL OS</b></span>
        </Link>
        <nav className="desktopNav" aria-label="Primary navigation">
          {visibleGroups.map((group)=>{
            const expanded=desktopMenu===group.label;
            const groupActive=group.links.some(([href])=>matchesPath(path,href));
            const menuId=`desktop-${group.label.toLowerCase().replaceAll(" ","-")}`;
            return <div className={groupActive?"desktopNavGroup active":"desktopNavGroup"} key={group.label}>
              <button type="button" onClick={()=>setDesktopMenu(expanded?null:group.label)} aria-expanded={expanded} aria-controls={menuId}>
                <span>{group.label}</span><i aria-hidden="true" />
              </button>
              <div id={menuId} className={expanded?"desktopNavMenu open":"desktopNavMenu"} aria-hidden={!expanded}>
                <div className="desktopNavMenuHead"><span>Explore</span><b>{group.label}</b></div>
                <div className="desktopNavMenuLinks">
                  {group.links.map(([href,label,glyph])=>{
                    const active=matchesPath(path,href);
                    return <Link key={href} href={href} className={active?"active":""} onClick={()=>beginNavigation(href)} aria-current={active?"page":undefined}>
                      <i>{glyph}</i><span><b>{label}</b><small>{navDescriptions[href]}</small></span><em aria-hidden="true">→</em>
                    </Link>;
                  })}
                </div>
              </div>
            </div>;
          })}
        </nav>
        <div className="desktopUtilities">
          <span className="seasonChip"><i />2026</span>
          <CommandPalette />
          <Link href={account?"/account":"/login"} className={account?.mustChangePassword?"accountChip action":"accountChip"}>
            <i>{account?.displayName?.slice(0,1)||"ID"}</i>
            <span><b>{authLoading?"Checking…":account?.displayName||"Sign in"}</b><small>{account?.mustChangePassword?"Change password":account?.franchiseName||"League account"}</small></span>
          </Link>
        </div>
      </div>
      <div className="desktopRouteBar"><span>{current}</span><small>League intelligence, built for the OKFL.</small></div>
    </header>

    {desktopMenu&&<button className="desktopMenuBackdrop" onClick={()=>setDesktopMenu(null)} aria-label="Close navigation menu" />}

    <aside id="mobile-league-navigation" className={open?"sidebar open":"sidebar"}>
      <Link href="/" className="brand" onClick={()=>beginNavigation("/")}><div className="brandMark"><img src="/okfl-logo.png" alt="" /></div><div className="brandCopy"><small>Obama Keeper Fantasy League</small><b>OKFL OS</b><span>League intelligence</span></div></Link>
      <nav>{visibleGroups.map((group)=>{const expanded=Boolean(openGroups[group.label]);const menuId=`nav-${group.label.toLowerCase().replaceAll(" ","-")}`;return <section className="navGroup" key={group.label}><button type="button" className={expanded?"navGroupToggle open":"navGroupToggle"} onClick={()=>toggleGroup(group.label)} aria-expanded={expanded} aria-controls={menuId}><span>{group.label}</span><i aria-hidden="true"/></button><div id={menuId} className={expanded?"navGroupMenu open":"navGroupMenu"} aria-hidden={!expanded}><div>{group.links.map(([href,label,glyph])=>{const active=matchesPath(path,href);return <Link key={href} href={href} onClick={()=>beginNavigation(href)} className={active?"active":""} aria-current={active?"page":undefined}><i>{glyph}</i><span>{label}</span><em/></Link>})}</div></div></section>})}</nav>
      <div className="sidebarStatus"><span><i /></span><div><b>Archive online</b><small>2021–2025 verified · 2026 live</small></div></div>
    </aside>

    <header className="mobileHeader">
      <button className="mobileMenuButton" onClick={()=>setOpen(!open)} aria-label={open?"Close navigation":"Open navigation"} aria-expanded={open} aria-controls="mobile-league-navigation"><span/><span/><span/></button>
      <Link href="/" className="mobileBrand"><img src="/okfl-logo.png" alt=""/><span><b>OKFL OS</b><small>{current}</small></span></Link>
      <div className="mobileUtilities"><Link className="mobileAccount" href={account?"/account":"/login"} aria-label={account?`${account.displayName} account`:"Manager sign in"}>{account?.displayName?.slice(0,1)||"ID"}</Link><CommandPalette /></div>
    </header>

    <div className={navigating?"navProgress active":"navProgress"} aria-hidden="true"><i/></div>

    <main className="main">
      {leagueNotice?.noticeActive&&<div className="leagueNotice"><div><span>League notice</span><b>{leagueNotice.noticeTitle}</b><p>{leagueNotice.noticeBody}</p></div>{leagueNotice.noticeHref&&<Link href={leagueNotice.noticeHref}>Open update</Link>}</div>}
      <div className="routeStage" key={path}>{children}</div>
    </main>

    <nav className="mobileDock" aria-label="Primary mobile navigation">
      {[["/","Home","01"],["/calendar","Calendar","CL"],["/live-league","Live","02"],["/mock-draft","Draft","11"]].map(([href,label,glyph])=>{const active=matchesPath(path,href);return <Link key={href} href={href} onClick={()=>beginNavigation(href)} className={active?"active":""} aria-current={active?"page":undefined}><i>{glyph}</i><span>{label}</span></Link>})}
      <button type="button" onClick={()=>setOpen(true)} className={open?"active":""} aria-label="Open all navigation"><i>••</i><span>Menu</span></button>
    </nav>

    {open&&<button className="backdrop" onClick={()=>setOpen(false)} aria-label="Close menu"/>}
  </div>;
}
