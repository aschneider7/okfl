"use client";

import Link from "next/link";
import Providers from "../providers";
import {Page,Loading} from "@/components/Page";
import {useData} from "@/components/DataProvider";
import {fmt} from "@/lib/data";
import {buildFranchiseProfile} from "@/lib/franchiseProfiles";

function View(){
  const {data}=useData();
  if(!data)return <Loading/>;
  const profiles=data.franchises.map((franchise:any)=>buildFranchiseProfile(data,franchise.id)).filter(Boolean) as NonNullable<ReturnType<typeof buildFranchiseProfile>>[];
  const traitLeader=(label:string)=>profiles.slice().sort((a,b)=>(b.dna.find((row)=>row.label===label)?.value||0)-(a.dna.find((row)=>row.label===label)?.value||0))[0];
  const identityLeaders=[
    {eyebrow:"Most active market",title:"Trade Trigger",profile:traitLeader("Trading pulse"),trait:"Trading pulse"},
    {eyebrow:"Best long-game planner",title:"Keeper Architect",profile:traitLeader("Keeper craft"),trait:"Keeper craft"},
    {eyebrow:"Best value finder",title:"Sleeper Hunter",profile:traitLeader("Draft excavation"),trait:"Draft excavation"},
    {eyebrow:"Highest weekly variance",title:"Chaos Index",profile:traitLeader("Weekly volatility"),trait:"Weekly volatility"},
  ];

  return <Page title="Franchise Scouting Reports" subtitle="Distinct identities built from actual league behavior—not recycled labels.">
    <div className="profileIntro card">
      <div><span className="eyebrow">Franchise Profiles 3.0</span><h2>Every front office now has its own fingerprint.</h2></div>
      <p>Primary identities and scouting lenses compare each team against the league baseline across trades, keepers, positional investment, weekly volatility, final finishes and historical success.</p>
    </div>
    <section className="identityLeaders"><header><div><span className="eyebrow">New · League identity leaders</span><h2>Who owns each front-office superlative?</h2></div><p>Calculated from the same league-relative DNA model used in every scouting report.</p></header><div>{identityLeaders.map((leader)=>{
      const value=leader.profile.dna.find((row)=>row.label===leader.trait)?.value||0;
      return <Link href={`/franchises/${leader.profile.franchise.id}`} key={leader.title}><span>{leader.eyebrow}</span><h3>{leader.title}</h3><b>{leader.profile.franchise.name}</b><footer><small>{leader.trait}</small><strong>{value}</strong></footer></Link>;
    })}</div></section>
    <div className="franchiseGrid profileGrid">
      {profiles.map((profile)=>{
        const {franchise}=profile;
        const {metric,tags,dna,signature,lenses}=profile;
        return <Link href={`/franchises/${franchise.id}`} className="franchiseCard profileCard" key={franchise.id}>
          <header className="franchiseCardHeader">
            <div><span className="franchiseId">{franchise.id}</span><h2>{franchise.name}</h2><p>{franchise.current_manager}<span>•</span> Founded 2021</p></div>
            <div className="signatureMark"><span>{signature.icon}</span><small>Signature</small></div>
          </header>
          <div className="signatureTitle"><b>{signature.label}</b><p>{signature.detail}</p></div>
          <div className="profileLensStrip">{lenses.slice(0,2).map((lens)=><div className={`tone-${lens.tone}`} key={lens.label}><small>{lens.label}</small><b>{lens.value}</b></div>)}</div>
          <section className="recordPanel">
            <div className="primaryRecord"><b>{metric.wins}-{metric.losses}{metric.ties?`-${metric.ties}`:""}</b><small>All-time record</small></div>
            <div className="winRate"><b>{Number(metric.win_pct).toFixed(1)}%</b><small>Win percentage</small></div>
          </section>
          <section className="franchiseStats compactStats">
            <div><b>{fmt(metric.pf)}</b><small>PF</small></div>
            <div><b>{fmt(metric.pa)}</b><small>PA</small></div>
            <div><b>{metric.championships}</b><small>Titles</small></div>
            <div><b>{metric.runner_ups}</b><small>Final losses</small></div>
          </section>
          <div className="profileTags">{tags.map((tag)=><em className={`tone-${tag.tone}`} key={tag.label}><span>{tag.icon}</span>{tag.label}</em>)}</div>
          <div className="miniDna">
            {dna.slice().sort((a,b)=>b.value-a.value).slice(0,3).map((row)=><div key={row.label}><span>{row.label}</span><i><b style={{width:`${row.value}%`}}/></i><strong>{row.value}</strong></div>)}
          </div>
          <footer className="profileCardFooter"><span>Open full scouting report</span><b>→</b></footer>
        </Link>
      })}
    </div>
  </Page>
}

export default function Franchises(){return <Providers><View/></Providers>}
