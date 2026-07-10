"use client";

import Providers from "../providers";
import { Page, Loading } from "@/components/Page";
import { useData } from "@/components/DataProvider";
import { fmt } from "@/lib/data";

function View() {
  const { data } = useData();
  if (!data) return <Loading />;

  return (
    <Page title="Franchise Scouting Reports" subtitle="Career performance, identity, final finishes, and league legacy.">
      <div className="franchiseGrid">
        {data.franchises.map((franchise) => {
          const metric = data.franchise_metrics.find((row) => row.franchise_id === franchise.id)!;
          return (
            <article className="franchiseCard" key={franchise.id}>
              <header className="franchiseCardHeader">
                <div>
                  <span className="franchiseId">{franchise.id}</span>
                  <h2>{franchise.name}</h2>
                  <p>Current: {franchise.current_manager} <span>•</span> Original: {franchise.original_manager}</p>
                </div>
                <div className="legacyBadge"><b>{metric.legacy_score}</b><small>Legacy</small></div>
              </header>

              <section className="recordPanel">
                <div className="primaryRecord">
                  <b>{metric.wins}-{metric.losses}{metric.ties ? `-${metric.ties}` : ""}</b>
                  <small>All-time record</small>
                </div>
                <div className="winRate">
                  <b>{Number(metric.win_pct).toFixed(1)}%</b>
                  <small>Win percentage</small>
                </div>
              </section>

              <section className="franchiseStats">
                <div><b>{fmt(metric.pf)}</b><small>Points for</small></div>
                <div><b>{fmt(metric.pa)}</b><small>Points against</small></div>
                <div><b>{metric.championships}</b><small>Championships</small></div>
                <div><b>{metric.runner_ups}</b><small>Runner-ups</small></div>
                <div><b>{metric.average_finish}</b><small>Avg finish</small></div>
                <div><b>{metric.trade_count}</b><small>Trades</small></div>
              </section>

              <div className="tags">
                {metric.profile_labels.map((label) => <em key={label}>{label}</em>)}
              </div>

              <section className="finishSection">
                <div className="sectionLabel">Final bracket finishes</div>
                <div className="finishTimeline">
                  {metric.season_finishes.map((finish: any) => (
                    <div key={finish.season} className={finish.finish <= 3 ? "podium" : ""}>
                      <span>{finish.season}</span>
                      <b>#{finish.finish}</b>
                    </div>
                  ))}
                </div>
              </section>
            </article>
          );
        })}
      </div>
    </Page>
  );
}

export default function Franchises() {
  return <Providers><View /></Providers>;
}
