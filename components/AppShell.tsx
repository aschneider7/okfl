"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useState} from "react";
import {CommandPalette} from "@/components/CommandPalette";

const links = [
  ["/", "Home", "HM"], ["/franchises", "Franchises", "FR"], ["/compare", "Compare", "VS"],
  ["/trades", "Trade Center", "TR"], ["/drafts", "Draft History", "DH"], ["/mock-draft", "Draft Room", "DR"],
  ["/keepers", "Keepers", "KP"], ["/records", "Record Book", "RB"], ["/time-machine", "Time Machine", "TM"],
  ["/rules", "Rulebook", "RL"], ["/commissioner", "Commissioner", "CM"],
] as const;
const mobileLinks = links.filter(([href]) => ["/", "/trades", "/mock-draft", "/keepers", "/records"].includes(href));

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
    <main className="main"><div className="topbar"><div className="topbarContext"><span>League intelligence</span><b>{current}</b></div><div className="topbarActions"><span className="seasonChip"><i />2026 season</span><CommandPalette /></div></div>{children}</main>
    <nav className="mobileDock" aria-label="Primary mobile navigation">{mobileLinks.map(([href, label, glyph]) => { const active = path === href || (href !== "/" && path.startsWith(href)); return <Link key={href} href={href} className={active ? "active" : ""}><i>{glyph}</i><span>{label === "Draft Room" ? "Draft" : label === "Trade Center" ? "Trades" : label === "Record Book" ? "Records" : label}</span></Link>; })}</nav>
    {open && <button className="backdrop" onClick={() => setOpen(false)} aria-label="Close menu" />}
  </div>;
}
