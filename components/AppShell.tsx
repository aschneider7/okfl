"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useState} from "react";
import {CommandPalette} from "@/components/CommandPalette";

const links = [
  ["/", "Home", "HM"], ["/live-league", "Live Dashboard", "LV"], ["/playoff-odds", "Playoff Odds", "PO"], ["/power-rankings", "Power Rankings", "PR"], ["/franchises", "Franchises", "FR"], ["/compare", "Compare", "VS"],
  ["/trades", "Trade Center", "TR"], ["/drafts", "Draft History", "DH"], ["/mock-draft", "Draft Room", "DR"], ["/live-draft", "Live Draft", "LD"],
  ["/keepers", "Keepers", "KP"], ["/records", "Record Book", "RB"], ["/time-machine", "Time Machine", "TM"],
  ["/rules", "Rulebook", "RL"], ["/commissioner", "Commissioner", "CM"],
] as const;
const mobileLinks = links.filter(([href]) => ["/", "/live-league", "/playoff-odds", "/power-rankings", "/live-draft"].includes(href));

export function AppShell({children}: {children: React.ReactNode}) {
  const path = usePathname(); const [open, setOpen] = useState(false);
  const current = links.find(([href]) => path === href || (href !== "/" && path.startsWith(href)))?.[1] || "League workspace";
  return <div className="shell">
    <aside className={open ? "sidebar open" : "sidebar"}>
      <div className="brand"><div className="brandMark"><span>OK</span></div><div className="brandCopy"><small>Obama Keeper Fantasy League</small><b>OKFL OS</b><span>League intelligence</span></div></div>
      <div className="navLabel">League workspace</div>
      <nav>{links.map(([href, label, glyph]) => { const active = path === href || (href !== "/" && path.startsWith(href)); return <Link key={href} href={href} onClick={() => setOpen(false)} className={active ? "active" : ""}><i>{glyph}</i><span>{label}</span><em /></Link>; })}</nav>
      <div className="sidebarStatus"><span><i /></span><div><b>Archive online</b><small>2021–2025 verified · 2026 live</small></div></div>
    </aside>
    <header className="mobileHeader"><button onClick={() => setOpen(!open)} aria-label="Open navigation" aria-expanded={open}><span /><span /><span /></button><div><b>OKFL OS</b><span>{current}</span></div><CommandPalette /></header>
    <main className="main"><div className="topbar"><div className="topbarContext"><span>League intelligence</span><b>{current}</b></div><div className="topbarActions"><span className="seasonChip"><i />2026 season</span><CommandPalette /></div></div><div className="routeStage" key={path}>{children}</div></main>
    <nav className="mobileDock" aria-label="Primary mobile navigation">{mobileLinks.map(([href, label, glyph]) => { const active = path === href || (href !== "/" && path.startsWith(href)); return <Link key={href} href={href} className={active ? "active" : ""}><i>{glyph}</i><span>{label === "Live Draft" ? "Draft" : label === "Live Dashboard" ? "Live" : label === "Playoff Odds" ? "Odds" : label === "Power Rankings" ? "Power" : label}</span></Link>; })}</nav>
    {open && <button className="backdrop" onClick={() => setOpen(false)} aria-label="Close menu" />}
  </div>;
}
