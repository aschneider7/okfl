"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useState} from "react";
import {CommandPalette} from "@/components/CommandPalette";

const links = [
  ["/", "Home", "01"],
  ["/franchises", "Franchises", "02"],
  ["/compare", "Compare", "03"],
  ["/trades", "Trades", "04"],
  ["/drafts", "Draft History", "05"],
  ["/mock-draft", "Draft Room", "06"],
  ["/keepers", "Keepers", "07"],
  ["/records", "Records", "08"],
  ["/time-machine", "Time Machine", "09"],
  ["/rules", "Rules", "10"],
  ["/commissioner", "Commissioner", "11"],
] as const;

const mobileLinks = links.filter(([href]) => ["/", "/trades", "/mock-draft", "/keepers", "/records"].includes(href));

export function AppShell({children}: {children: React.ReactNode}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return <div className="shell">
    <aside className={open ? "sidebar open" : "sidebar"}>
      <div className="brand">
        <div className="brandMark">O</div>
        <div className="brandCopy"><small>Obama Keeper Fantasy League</small><b>OKFL OS</b><span>Version 3.1</span></div>
      </div>
      <div className="navLabel">League workspace</div>
      <nav>{links.map(([href, label, index]) => {
        const active = path === href || (href !== "/" && path.startsWith(href));
        return <Link key={href} href={href} onClick={() => setOpen(false)} className={active ? "active" : ""}>
          <i>{index}</i><span>{label}</span>
        </Link>;
      })}</nav>
      <div className="sidebarStatus"><span>OK</span><div><b>Archive verified</b><small>2021–2025 · Live 2026</small></div></div>
    </aside>

    <header className="mobileHeader">
      <button onClick={() => setOpen(!open)} aria-label="Open navigation"><span /><span /><span /></button>
      <div><b>OKFL OS</b><span>Version 3.1</span></div>
      <CommandPalette />
    </header>

    <main className="main"><div className="desktopCommand"><CommandPalette /></div>{children}</main>
    <nav className="mobileDock" aria-label="Primary mobile navigation">
      {mobileLinks.map(([href, label, index]) => {
        const active = path === href || (href !== "/" && path.startsWith(href));
        return <Link key={href} href={href} className={active ? "active" : ""}>
          <i>{index}</i><span>{label === "Draft Room" ? "Draft" : label}</span>
        </Link>;
      })}
    </nav>
    {open && <button className="backdrop" onClick={() => setOpen(false)} aria-label="Close menu" />}
  </div>;
}
