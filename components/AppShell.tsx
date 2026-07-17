"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  ["/", "Home", "⌂"],
  ["/franchises", "Franchises", "F"],
  ["/compare", "Compare", "↔"],
  ["/trades", "Trades", "⇄"],
  ["/drafts", "Drafts", "D"],
  ["/keepers", "Keepers", "K"],
  ["/records", "Records", "R"],
  ["/time-machine", "Time Machine", "T"],
  ["/rules", "Rules", "§"],
  ["/commissioner", "Commissioner", "⚙"],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="shell">
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brandMark">O</div>
          <div>
            <small>Obama Keeper Fantasy League</small>
            <b>OKFL OS</b>
            <span>v0.6.5</span>
          </div>
        </div>
        <nav>
          {links.map(([href, label, icon]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={path === href ? "active" : ""}>
              <i>{icon}</i><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebarStatus"><span>✓</span><div><b>Data verified</b><small>2021–2025 archive</small></div></div>
      </aside>

      <header className="mobileHeader">
        <button onClick={() => setOpen(!open)} aria-label="Open navigation">☰</button>
        <div><b>OKFL OS</b><span>v0.6.5</span></div>
        <span className="mobileStatus">Live</span>
      </header>

      <main className="main">{children}</main>
      {open && <button className="backdrop" onClick={() => setOpen(false)} aria-label="Close menu" />}
    </div>
  );
}
