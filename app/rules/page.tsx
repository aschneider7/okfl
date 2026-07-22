"use client";

import { useEffect,useState } from "react";
import { Page, Loading } from "@/components/Page";
import { useData } from "@/components/DataProvider";

function View() {
  const { data } = useData();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [openRule, setOpenRule] = useState<string | null>(null);
  const [managedRules,setManagedRules]=useState<any[]>([]);
  const [managedRulebook,setManagedRulebook]=useState(false);
  const [rulebookVersion,setRulebookVersion]=useState("2026.1");

  useEffect(()=>{let active=true;fetch("/api/league-settings",{cache:"no-store"}).then((response)=>response.json()).then((body)=>{if(!active)return;setManagedRules((body.rules||[]).map((rule:any)=>({id:rule.id,category:rule.category,rule:rule.rule})));setManagedRulebook(Boolean(body.managedRulebook));setRulebookVersion(body.settings?.rulebookVersion||"2026.1")}).catch(()=>{});return()=>{active=false}},[]);

  if (!data) return <Loading />;

  const rules=managedRulebook?managedRules:data.rules;
  const categories = [...new Set(rules.map((rule: any) => String(rule.category)))].sort();
  const term = query.toLowerCase().trim();
  const filtered = rules.filter((rule: any) => {
    const categoryMatch = category === "all" || rule.category === category;
    const termMatch =
      !term ||
      `${rule.id} ${rule.category} ${rule.rule}`.toLowerCase().includes(term);
    return categoryMatch && termMatch;
  });

  const grouped = categories
    .map((name) => ({ name, rules: filtered.filter((rule: any) => rule.category === name) }))
    .filter((group) => group.rules.length);

  return (
    <Page title="Official Rulebook" subtitle="The complete OKFL constitution, organized for quick commissioner and manager reference.">
      <section className="rulesHero">
        <div>
          <span className="eyebrow">League constitution</span>
          <h2>{rules.length} official rules</h2>
          <p>Search the rulebook, browse by category, and expand individual rules for a cleaner reading experience.</p>
        </div>
        <div className="rulesHeroMarks">
          <div><b>{categories.length}</b><span>Categories</span></div>
          <div><b>v{rulebookVersion}</b><span>Rulebook</span></div>
          <div><b>$100</b><span>League entry</span></div>
        </div>
      </section>

      <section className="card rulesToolbar">
        <label className="rulesSearch"><span>Search rulebook</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Keeper cost, trades, playoffs…" /></label>
        <div className="ruleCategoryTabs">
          <button className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>All</button>
          {categories.map((name) => <button className={category === name ? "active" : ""} key={name} onClick={() => setCategory(name)}>{name}</button>)}
        </div>
      </section>

      <div className="rulebookLayout">
        <aside className="card rulebookIndex">
          <span className="eyebrow">Rulebook index</span>
          <h2>Categories</h2>
          {categories.map((name) => {
            const count = rules.filter((rule: any) => rule.category === name).length;
            return <button className={category === name ? "active" : ""} key={name} onClick={() => setCategory(name)}><span>{name}</span><b>{count}</b></button>;
          })}
        </aside>

        <section className="ruleGroups">
          {grouped.map((group) => (
            <article className="ruleCategoryCard" key={group.name}>
              <header><div><span className="eyebrow">Rule category</span><h2>{group.name}</h2></div><b>{group.rules.length}</b></header>
              <div className="ruleAccordion">
                {group.rules.map((rule: any) => {
                  const open = openRule === rule.id;
                  return (
                    <button type="button" className={open ? "open" : ""} key={rule.id} onClick={() => setOpenRule(open ? null : rule.id)}>
                      <span className="ruleId">{rule.id}</span>
                      <div><b>{rule.rule}</b>{open && <p>Official OKFL rule • Category: {rule.category}</p>}</div>
                      <strong>{open ? "−" : "+"}</strong>
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
          {!grouped.length && <div className="card rulesEmpty">No rules match your search.</div>}
        </section>
      </div>
    </Page>
  );
}

export default function Rules() {
  return <View />;
}
