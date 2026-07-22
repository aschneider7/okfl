"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "@/components/DataProvider";
import { suggestions, SearchResult } from "@/lib/searchEngine";
import { parseLiveNflQuery } from "@/lib/liveNflQuery";

export function CommandPalette() {
  const { data,loadData } = useData({lazy:true});
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
      if (((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") || (event.key === "/" && !typing)) {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open){void loadData();window.setTimeout(() => inputRef.current?.focus(), 20)}
  }, [open,loadData]);
  useEffect(() => setActive(0), [query]);

  const baseRows = useMemo(() => (data ? suggestions(data, query, 20) : []), [data, query]);
  const liveIntent = useMemo(() => parseLiveNflQuery(query), [query]);
  const rows = useMemo(() => {
    if (!liveIntent) return baseRows;
    const liveRow: SearchResult = {
      id: `live-${liveIntent.player}-${liveIntent.season}-${liveIntent.week}-${liveIntent.scoring}`,
      group: "Live NFL",
      title: `${liveIntent.player} • ${liveIntent.season} Week ${liveIntent.week}`,
      detail: `${liveIntent.scoring.toUpperCase()} weekly fantasy points and full stat line`,
      icon: "NFL",
      href: `/?q=${encodeURIComponent(query)}`,
      score: 1000,
      preview: [
        { label: "Season", value: String(liveIntent.season) },
        { label: "Week", value: String(liveIntent.week) },
        { label: "Scoring", value: liveIntent.scoring.toUpperCase() },
      ],
    };
    return [liveRow, ...baseRows.filter((row) => row.id !== liveRow.id)].slice(0, 20);
  }, [baseRows, liveIntent, query]);

  const selected = rows[active];

  function go(row: SearchResult) {
    setOpen(false);
    setQuery("");
    router.push(row.href || `/?q=${encodeURIComponent(row.title)}`);
  }

  function handleKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => (value + 1) % Math.max(1, rows.length));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => (value - 1 + Math.max(1, rows.length)) % Math.max(1, rows.length));
    }
    if (event.key === "Enter" && selected) {
      event.preventDefault();
      go(selected);
    }
  }

  return (
    <>
      <button className="globalSearchTrigger nflGlobalSearch" onClick={() => setOpen(true)}>
        <span>⌕</span><b>Search OKFL</b><kbd>CTRL K</kbd>
      </button>
      {open && (
        <div className="command3Overlay nflCommandOverlay" onMouseDown={() => setOpen(false)}>
          <div className="command3 nflCommand" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <span>⌕</span>
              <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleKey} placeholder="Search league history or weekly NFL stats…" />
              <kbd>ESC</kbd>
            </header>
            <div className="command3Body">
              <div className="command3List">
                {rows.map((row, index) => (
                  <button type="button" className={index === active ? "active" : ""} key={row.id} onMouseEnter={() => setActive(index)} onClick={() => go(row)}>
                    <i>{row.icon}</i><span><b>{row.title}</b><small>{row.group} • {row.detail}</small></span><strong>›</strong>
                  </button>
                ))}
                {!rows.length && <div className="commandEmpty">Type a player, franchise, season, record, or weekly stat query.</div>}
              </div>
              <aside>
                {selected ? (
                  <>
                    <div className="previewIcon">{selected.icon}</div>
                    <span>{selected.group}</span><h2>{selected.title}</h2><p>{selected.detail}</p>
                    {selected.preview && <div>{selected.preview.map((item) => <section key={item.label}><b>{item.value}</b><small>{item.label}</small></section>)}</div>}
                    <button type="button" onClick={() => go(selected)}>OPEN RESULT →</button>
                  </>
                ) : (
                  <><div className="previewIcon">NFL</div><span>OKFL OS</span><h2>Search Engine 3.1</h2><p>League history and live weekly NFL fantasy results in one command bar.</p></>
                )}
              </aside>
            </div>
            <footer><span>↑↓ NAVIGATE</span><span>↵ OPEN</span><span>/ SEARCH ANYWHERE</span></footer>
          </div>
        </div>
      )}
    </>
  );
}
