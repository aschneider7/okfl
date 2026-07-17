"use client";

import {useEffect,useMemo,useState} from "react";
import {Page} from "@/components/Page";
import {
  DRAFT_ROUNDS,
  defaultFallbackPool,
  explainPick,
  managers,
  overallToRoundSlot,
  projectedKeepers,
  scorePlayer,
  teamRoster,
  type DraftPick,
  type DraftPlayer,
} from "@/lib/draftSimulator";

const positionColors:Record<string,string>={
  QB:"#b63d72",RB:"#50a886",WR:"#3d9bc7",TE:"#d08b3e",K:"#7a8190",DEF:"#7a8190"
};

function pickKey(round:number,slot:number){return `${round}-${slot}`}

export default function MockDraftPage(){
  const [pool,setPool]=useState<DraftPlayer[]>(defaultFallbackPool());
  const [picks,setPicks]=useState<DraftPick[]>([]);
  const [overall,setOverall]=useState(1);
  const [speed,setSpeed]=useState(500);
  const [query,setQuery]=useState("");
  const [position,setPosition]=useState("ALL");
  const [message,setMessage]=useState("Choose any team to control. The official 2026 order stays fixed.");
  const [simulating,setSimulating]=useState(false);
  const [controlledFranchise,setControlledFranchise]=useState("F01");

  // Load live values when available; fallback remains usable.
  useEffect(()=>{
    let cancelled=false;
    fetch("/api/trade-values",{cache:"no-store"})
      .then((response)=>response.ok?response.json():Promise.reject())
      .then((body)=>{
        if(cancelled)return;
        const values=body.players||body.values||body.data||[];
        if(Array.isArray(values)&&values.length){
          const mapped=values.map((row:any,index:number)=>({
            name:row.player||row.name,
            position:row.position||row.pos||"—",
            team:row.team||"—",
            marketValue:Number(row.value||row.redraft_value||row.value_1qb||row.value_2qb||0),
            rank:Number(row.rank||row.redraft_rank||row.rank_1qb||row.rank_2qb||index+1),
            pprRank:Number(row.rank||row.redraft_rank||row.rank_1qb||row.rank_2qb||index+1),
            age:row.age?Number(row.age):null,
            keeperEligible:true,
            source:"live",
          })).filter((row:any)=>row.name&&row.marketValue>0);
          if(mapped.length>30)setPool(mapped);
        }
      }).catch(()=>{});
    return()=>{cancelled=true};
  },[]);

  const keeperPicks=useMemo(()=>{
    const keeperRows:DraftPick[]=[];
    for(const keeper of projectedKeepers){
      const manager=managers.find((row)=>row.franchiseId===keeper.franchiseId)!;
      const pickInRound = keeper.round % 2 === 1 ? manager.slot : 11 - manager.slot;
      const overallPick=(keeper.round-1)*10+pickInRound;
      keeperRows.push({
        overall:overallPick,round:keeper.round,slot:manager.slot,
        franchiseId:manager.franchiseId,manager:manager.manager,
        player:{
          name:keeper.player,position:keeper.position,team:"—",marketValue:0,rank:999,
          keeperEligible:false,source:"keeper"
        },
        keeper:true,keeperCost:keeper.round,
        explanation:[`Projected keeper locked into Round ${keeper.round}.`],
      });
    }
    return keeperRows;
  },[]);

  const allPicks=[...keeperPicks,...picks];
  const pickedNames=new Set(allPicks.map((pick)=>pick.player.name.toLowerCase()));
  const available=pool.filter((player)=>!pickedNames.has(player.name.toLowerCase()));

  const current=overallToRoundSlot(overall);
  const currentManager=managers.find((manager)=>manager.slot===current.slot)!;
  const keeperAtCurrent=keeperPicks.find((pick)=>pick.overall===overall);

  const recommendations=useMemo(()=>{
    const roster=teamRoster(allPicks,currentManager.franchiseId);
    return available
      .map((player)=>({
        player,
        score:scorePlayer({player,manager:currentManager,roster,pool:available,round:current.round}),
      }))
      .sort((a,b)=>b.score-a.score)
      .slice(0,8);
  },[available,allPicks,currentManager,current.round]);

  const filteredPool=available
    .filter((player)=>position==="ALL"||player.position===position)
    .filter((player)=>!query.trim()||player.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a,b)=>b.marketValue-a.marketValue)
    .slice(0,80);

  function advancePastKeepers(nextOverall:number){
    let next=nextOverall;
    while(next<=DRAFT_ROUNDS*10&&keeperPicks.some((pick)=>pick.overall===next)) next++;
    setOverall(next);
  }

  function makePick(player:DraftPlayer,forcedManager=currentManager){
    if(overall>DRAFT_ROUNDS*10)return;
    const roster=teamRoster(allPicks,forcedManager.franchiseId);
    const explanation=explainPick({
      player,manager:forcedManager,roster,pool:available,round:current.round
    });
    const newPick:DraftPick={
      overall,round:current.round,slot:current.slot,
      franchiseId:forcedManager.franchiseId,manager:forcedManager.manager,
      player,keeper:false,explanation
    };
    setPicks((rows)=>[...rows,newPick]);
    setMessage(`${forcedManager.manager} selected ${player.name}. ${explanation[0]}`);
    advancePastKeepers(overall+1);
  }

  function aiPick(){
    const best=recommendations[0]?.player;
    if(best)makePick(best);
  }

  async function simulateUntilControlled(){
    if(simulating)return;
    setSimulating(true);
    let guard=0;
    while(guard<25){
      guard++;
      const now=overallToRoundSlot(overall);
      const manager=managers.find((row)=>row.slot===now.slot)!;
      if(manager.franchiseId===controlledFranchise&&!keeperPicks.some((pick)=>pick.overall===overall))break;
      if(keeperPicks.some((pick)=>pick.overall===overall)){
        advancePastKeepers(overall+1);
      }else{
        aiPick();
      }
      await new Promise((resolve)=>setTimeout(resolve,speed));
    }
    setSimulating(false);
  }

  function undo(){
    if(!picks.length)return;
    const last=picks[picks.length-1];
    setPicks((rows)=>rows.slice(0,-1));
    setOverall(last.overall);
    setMessage(`Undid ${last.manager}'s pick of ${last.player.name}.`);
  }

  function reset(){
    setPicks([]);setOverall(1);setMessage("Draft reset. Projected keepers remain locked.");
  }

  const board=new Map<string,DraftPick>();
  for(const pick of allPicks)board.set(pickKey(pick.round,pick.slot),pick);

  return <Page title="2026 OKFL Mock Draft" subtitle="A league-specific 2QB simulator built from the 2026 order, projected keepers, current market value, roster needs, and manager tendencies.">
    <section className="draftControlBar">
      <div>
        <span className="eyebrow">On the clock</span>
        <h2>{overall<=170?`${currentManager.manager} • ${current.round}.${current.slot}`:"Draft complete"}</h2>
        <p>{message}</p>
        <label className="draftAsControl">
          <span>Draft as</span>
          <select value={controlledFranchise} onChange={(event)=>setControlledFranchise(event.target.value)}>
            {managers.map((manager)=><option key={manager.franchiseId} value={manager.franchiseId}>{manager.manager} • Pick {manager.slot}</option>)}
          </select>
        </label>
      </div>
      <div className="draftControlButtons">
        <button onClick={aiPick} disabled={overall>170||keeperAtCurrent!=null}>Auto pick</button>
        <button onClick={simulateUntilControlled} disabled={simulating||overall>170}>{simulating?"Simulating…":"Sim to My Pick"}</button>
        <button onClick={undo} disabled={!picks.length}>Undo</button>
        <button onClick={reset}>Reset</button>
        <select value={speed} onChange={(event)=>setSpeed(Number(event.target.value))}>
          <option value={150}>Fast</option><option value={500}>Normal</option><option value={1000}>Slow</option>
        </select>
      </div>
    </section>

    <section className="draftBoardWrap">
      <div className="draftManagerHeader">
        {managers.map((manager)=><div key={manager.franchiseId}><span>{manager.slot}</span><b>{manager.manager}</b><small>{manager.franchiseId}</small></div>)}
      </div>
      <div className="draftBoard">
        {Array.from({length:DRAFT_ROUNDS},(_,roundIndex)=>{
          const round=roundIndex+1;
          return Array.from({length:10},(_,slotIndex)=>{
            const slot=slotIndex+1;
            const pick=board.get(pickKey(round,slot));
            const active=overallToRoundSlot(overall).round===round&&overallToRoundSlot(overall).slot===slot;
            return <div className={`draftCell ${active?"active":""} ${pick?.keeper?"keeper":""}`} key={`${round}-${slot}`}>
              <span className="pickNumber">{round}.{slot}</span>
              {pick?<div className="draftedPlayer" style={{background:positionColors[pick.player.position]||"#5b6575"}}>
                <b>{pick.player.name}</b><small>{pick.player.position} • {pick.player.team}</small>{pick.keeper&&<em>KEEPER</em>}
              </div>:<span className="emptyPick">{round%2===1?"→":"←"}</span>}
            </div>
          })
        })}
      </div>
    </section>

    <div className="draftWorkspace">
      <section className="card draftAvailable">
        <header>
          <div><span className="eyebrow">Player pool</span><h2>Available players</h2></div>
          <div>
            <select value={position} onChange={(event)=>setPosition(event.target.value)}>
              {["ALL","QB","RB","WR","TE"].map((value)=><option key={value}>{value}</option>)}
            </select>
            <input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search player"/>
          </div>
        </header>
        <div className="availableTable">
          {filteredPool.map((player)=><button key={player.name} onClick={()=>makePick(player)} disabled={currentManager.franchiseId!==controlledFranchise}>
            <span className="rank">{player.rank}</span>
            <span className="pos" style={{background:positionColors[player.position]||"#5b6575"}}>{player.position}</span>
            <b>{player.name}</b><small>{player.team}</small><strong>{Math.round(player.marketValue)}</strong>
          </button>)}
        </div>
      </section>

      <aside className="card draftRecommendations">
        <span className="eyebrow">Pick recommendations</span>
        <h2>{currentManager.manager}'s board</h2>
        {recommendations.slice(0,5).map((row,index)=><button key={row.player.name} onClick={()=>makePick(row.player)} disabled={currentManager.franchiseId!==controlledFranchise}>
          <span>{index+1}</span><div><b>{row.player.name}</b><small>{row.player.position} • {row.player.team}</small></div><strong>{Math.round(row.score)}</strong>
        </button>)}
        <p className="recommendationNote">The model starts with full-PPR rankings, then moves QBs up by about 0.4 rounds based on prior OKFL drafts. It also weighs roster need, scarcity, keeper value, youth, and manager tendencies.</p>
      </aside>
    </div>
  </Page>
}
