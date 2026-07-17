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

  return <Page title="Franchise Scouting Reports" subtitle="Distinct identities built from actual league behavior—not recycled labels.">
    <div className="profileIntro card">
      <div><span className="eyebrow">Franchise Profiles 2.0</span><h2>Every front office now has its own fingerprint.</h2></div>
      <p>Badges are ranked against the rest of the league using trade volume, keeper usage, draft tendencies, weekly scoring, final finishes and historical success.</p>
    </div>
    <div className="franchiseGrid profileGrid">
      {data.franchises.map((franchise:any)=>{
        const profile=buildFranchiseProfile(data,franchise.id);
        if(!profile)return null;
        const {metric,tags,dna,signature}=profile;
        return <Link href={`/franchises/${franchise.id}`} className="franchiseCard profileCard" key={franchise.id}>
          <header className="franchiseCardHeader">
            <div><span className="franchiseId">{franchise.id}</span><h2>{franchise.name}</h2><p>{franchise.current_manager}<span>•</span> Founded 2021</p></div>
            <div className="signatureMark"><span>{signature.icon}</span><small>Signature</small></div>
          </header>
          <div className="signatureTitle"><b>{signature.label}</b><p>{signature.detail}</p></div>
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
