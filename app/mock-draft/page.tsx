"use client";

import {useMemo,useState} from "react";
import {Page} from "@/components/Page";
import {
  DRAFT_ROUNDS,
  OKFL_QB_PREMIUM_PICKS,
  explainPick,
  fallbackPprPool,
  keeperOverall,
  managers,
  overallToRoundSlot,
  pickGrade,
  pprAdjustedRank,
  pprAdjustedValue,
  projectedKeepers,
  scorePlayer,
  teamRoster,
  type DraftPick,
  type DraftPlayer,
} from "@/lib/draftSimulator";

const positionClass:Record<string,string>={QB:"posQB",RB:"posRB",WR:"posWR",TE:"posTE",K:"posK",DEF:"posDEF"};
const pickKey=(round:number,slot:number)=>`${round}-${slot}`;

function keeperRows():DraftPick[]{
  return projectedKeepers.map((keeper)=>{
    const manager=managers.find((row)=>row.franchiseId===keeper.franchiseId)!;
    return {
      overall:keeperOverall(keeper.round,manager.slot),
      round:keeper.round,
      slot:manager.slot,
      franchiseId:manager.franchiseId,
      manager:manager.manager,
      player:{
        name:keeper.player,position:keeper.position,team:"—",
        pprRank:999,pprValue:0,keeperEligible:false,source:"keeper"
      },
      keeper:true,
      keeperCost:keeper.round,
      grade:"K",
      explanation:[`Projected keeper uses ${manager.manager}'s Round ${keeper.round} pick.`],
    };
  });
}

export default function MockDraftPage(){
  const [pool]=useState<DraftPlayer[]>(fallbackPprPool());
  const [controlledFranchise,setControlledFranchise]=useState("F01");
  const [draftPicks,setDraftPicks]=useState<DraftPick[]>([]);
  const [overall,setOverall]=useState(1);
  const [started,setStarted]=useState(false);
  const [complete,setComplete]=useState(false);
  const [query,setQuery]=useState("");
  const [position,setPosition]=useState("ALL");
  const [selectedPlayer,setSelectedPlayer]=useState<DraftPlayer|null>(null);
  const [lastMessage,setLastMessage]=useState("Choose a team and press Start Mock.");
  const [activePanel,setActivePanel]=useState<"players"|"roster"|"intel">("players");

  const keepers=useMemo(()=>keeperRows(),[]);
  const allPicks=[...keepers,...draftPicks];
  const draftedNames=new Set(allPicks.map((pick)=>pick.player.name.toLowerCase()));
  const available=pool.filter((player)=>!draftedNames.has(player.name.toLowerCase()));

  const current=overall<=DRAFT_ROUNDS*10?overallToRoundSlot(overall):null;
  const currentManager=current?managers.find((manager)=>manager.slot===current.slot)!:null;
  const controlledManager=managers.find((manager)=>manager.franchiseId===controlledFranchise)!;
  const userOnClock=Boolean(started&&!complete&&currentManager?.franchiseId===controlledFranchise);

  function getRecommendations(
    workingPicks:DraftPick[],
    workingOverall:number,
    workingAvailable:DraftPlayer[],
    manager=currentManager!,
  ){
    const spot=overallToRoundSlot(workingOverall);
    const roster=teamRoster([...keepers,...workingPicks],manager.franchiseId);
    return workingAvailable
      .map((player)=>({
        player,
        score:scorePlayer({
          player,manager,roster,pool:workingAvailable,round:spot.round,seed:workingOverall
        })
      }))
      .sort((a,b)=>b.score-a.score||pprAdjustedRank(a.player)-pprAdjustedRank(b.player));
  }

  const recommendations=useMemo(()=>{
    if(!currentManager||!current)return[];
    return getRecommendations(draftPicks,overall,available,currentManager).slice(0,8);
  },[draftPicks,overall,controlledFranchise]);

  function createPick(
    player:DraftPlayer,
    manager:typeof managers[number],
    pickOverall:number,
    workingPicks:DraftPick[],
    workingAvailable:DraftPlayer[],
  ):DraftPick{
    const spot=overallToRoundSlot(pickOverall);
    const roster=teamRoster([...keepers,...workingPicks],manager.franchiseId);
    return {
      overall:pickOverall,
      round:spot.round,
      slot:spot.slot,
      franchiseId:manager.franchiseId,
      manager:manager.manager,
      player,
      keeper:false,
      grade:pickGrade(player,pickOverall),
      explanation:explainPick({
        player,manager,roster,pool:workingAvailable,round:spot.round
      }),
    };
  }

  function simulateToUser(
    initialPicks:DraftPick[],
    initialOverall:number,
  ){
    let workingPicks=[...initialPicks];
    let workingOverall=initialOverall;
    let workingAvailable=pool.filter(
      (player)=>![...keepers,...workingPicks].some(
        (pick)=>pick.player.name.toLowerCase()===player.name.toLowerCase()
      )
    );

    while(workingOverall<=DRAFT_ROUNDS*10){
      const keeper=keepers.find((pick)=>pick.overall===workingOverall);
      if(keeper){
        workingOverall+=1;
        continue;
      }

      const spot=overallToRoundSlot(workingOverall);
      const manager=managers.find((row)=>row.slot===spot.slot)!;
      if(manager.franchiseId===controlledFranchise)break;

      const choice=getRecommendations(
        workingPicks,workingOverall,workingAvailable,manager
      )[0]?.player;
      if(!choice)break;

      const pick=createPick(
        choice,manager,workingOverall,workingPicks,workingAvailable
      );
      workingPicks.push(pick);
      workingAvailable=workingAvailable.filter(
        (player)=>player.name!==choice.name
      );
      workingOverall+=1;
    }

    setDraftPicks(workingPicks);
    setOverall(workingOverall);
    setComplete(workingOverall>DRAFT_ROUNDS*10);

    if(workingOverall>DRAFT_ROUNDS*10){
      setLastMessage("Mock draft complete.");
    }else{
      const spot=overallToRoundSlot(workingOverall);
      setLastMessage(
        `${controlledManager.manager} is on the clock at ${spot.round}.${spot.slot}.`
      );
    }
  }

  function startMock(){
    setStarted(true);
    setComplete(false);
    setDraftPicks([]);
    setSelectedPlayer(null);
    simulateToUser([],1);
  }

  function makeUserPick(player:DraftPlayer){
    if(!userOnClock||!currentManager||!current)return;

    const pick=createPick(
      player,currentManager,overall,draftPicks,available
    );
    const nextPicks=[...draftPicks,pick];
    setSelectedPlayer(null);
    setLastMessage(
      `${controlledManager.manager} selected ${player.name} (${pick.grade}).`
    );
    simulateToUser(nextPicks,overall+1);
  }

  function undoUserTurn(){
    const userIndexes=draftPicks
      .map((pick,index)=>({pick,index}))
      .filter(({pick})=>pick.franchiseId===controlledFranchise);

    const last=userIndexes.at(-1);
    if(!last)return;

    const restored=draftPicks.slice(0,last.index);
    setDraftPicks(restored);
    setOverall(last.pick.overall);
    setComplete(false);
    setStarted(true);
    setLastMessage(`Undid ${last.pick.player.name}. ${controlledManager.manager} is back on the clock.`);
  }

  function reset(){
    setDraftPicks([]);
    setOverall(1);
    setStarted(false);
    setComplete(false);
    setSelectedPlayer(null);
    setLastMessage("Choose a team and press Start Mock.");
  }

  const board=new Map<string,DraftPick>();
  for(const pick of allPicks)board.set(pickKey(pick.round,pick.slot),pick);

  const filteredPlayers=available
    .filter((player)=>position==="ALL"||player.position===position)
    .filter((player)=>!query.trim()||player.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a,b)=>pprAdjustedRank(a)-pprAdjustedRank(b))
    .slice(0,100);

  const controlledRoster=allPicks
    .filter((pick)=>pick.franchiseId===controlledFranchise)
    .sort((a,b)=>a.overall-b.overall);

  const recentPicks=[...allPicks]
    .filter((pick)=>!pick.keeper)
    .sort((a,b)=>b.overall-a.overall)
    .slice(0,8);

  return <Page
    title="2026 OKFL Draft Room"
    subtitle="Full-PPR rankings, a modest quarterback bump, locked projected keepers, and AI managers with distinct OKFL identities."
  >
    <section className="draftV2Setup">
      <div className="draftV2Brand">
        <span className="eyebrow">Mock Draft 2.0</span>
        <h2>{started?`${controlledManager.manager}'s Draft Room`:"Choose your franchise"}</h2>
        <p>{lastMessage}</p>
      </div>

      <div className="draftV2TeamSelect">
        <label>
          <span>Control team</span>
          <select
            value={controlledFranchise}
            disabled={started}
            onChange={(event)=>setControlledFranchise(event.target.value)}
          >
            {managers.map((manager)=>
              <option key={manager.franchiseId} value={manager.franchiseId}>
                Pick {manager.slot} • {manager.manager}
              </option>
            )}
          </select>
        </label>

        {!started
          ? <button className="startMockButton" onClick={startMock}>Start Mock</button>
          : <>
              <button onClick={undoUserTurn}>Undo My Last Pick</button>
              <button onClick={reset}>New Mock</button>
            </>
        }
      </div>
    </section>

    <section className="draftV2Identity">
      <div className="identityBadge">{controlledManager.slot}</div>
      <div>
        <span>{controlledManager.archetype}</span>
        <b>{controlledManager.manager}</b>
        <p>“{controlledManager.motto}”</p>
      </div>
      <div className="identityMeters">
        <div><span>QB urgency</span><i><b style={{width:`${controlledManager.tendencies.qbAggression*100}%`}}/></i></div>
        <div><span>Keeper focus</span><i><b style={{width:`${controlledManager.tendencies.keeperFocus*100}%`}}/></i></div>
        <div><span>Risk</span><i><b style={{width:`${controlledManager.tendencies.risk*100}%`}}/></i></div>
      </div>
      <div className="draftV2ModelNote">
        <b>PPR-first model</b>
        <span>QBs move only {OKFL_QB_PREMIUM_PICKS} picks above their PPR rank.</span>
      </div>
    </section>

    <div className="draftV2Layout">
      <section className="draftV2BoardPanel">
        <header>
          <div>
            <span className="eyebrow">Official 2026 order</span>
            <h2>Live draft board</h2>
          </div>
          <div className={`clockStatus ${userOnClock?"yourTurn":""}`}>
            <span>{complete?"Complete":userOnClock?"Your pick":"AI drafting"}</span>
            <b>{current?`${current.round}.${current.slot}`:"—"}</b>
          </div>
        </header>

        <div className="draftV2BoardScroller">
          <div className="draftV2ManagerRow">
            {managers.map((manager)=>
              <div
                className={manager.franchiseId===controlledFranchise?"controlled":""}
                key={manager.franchiseId}
              >
                <span>{manager.slot}</span>
                <b>{manager.manager}</b>
                <small>{manager.archetype}</small>
              </div>
            )}
          </div>

          <div className="draftV2Board">
            {Array.from({length:DRAFT_ROUNDS},(_,roundIndex)=>{
              const round=roundIndex+1;
              return Array.from({length:10},(_,slotIndex)=>{
                const slot=slotIndex+1;
                const pick=board.get(pickKey(round,slot));
                const active=current?.round===round&&current?.slot===slot;
                const manager=managers.find((row)=>row.slot===slot)!;

                return <div
                  className={[
                    "draftV2Cell",
                    active?"active":"",
                    pick?.keeper?"keeper":"",
                    manager.franchiseId===controlledFranchise?"controlledColumn":"",
                  ].join(" ")}
                  key={`${round}-${slot}`}
                >
                  <span className="draftV2PickLabel">{round}.{slot}</span>
                  {pick
                    ? <div className={`draftV2Player ${positionClass[pick.player.position]||""}`}>
                        <b>{pick.player.name}</b>
                        <small>{pick.player.position} • {pick.player.team}</small>
                        <footer>
                          <span>{pick.keeper?`KEEPER R${pick.keeperCost}`:`Grade ${pick.grade}`}</span>
                        </footer>
                      </div>
                    : <div className="draftV2Empty">
                        <span>{round%2===1?"→":"←"}</span>
                      </div>
                  }
                </div>
              })
            })}
          </div>
        </div>
      </section>

      <aside className="draftV2Sidebar">
        <article className="draftV2OnClock">
          <span className="eyebrow">{userOnClock?"You are on the clock":"Draft status"}</span>
          <h2>{currentManager?.manager||"Draft complete"}</h2>
          <p>
            {userOnClock
              ? `Pick a player below. The simulator will immediately make every AI selection until your next turn.`
              : complete
                ? "The full mock is complete."
                : started
                  ? "The simulator is advancing to your next pick."
                  : "Press Start Mock to auto-draft every pick before your first selection."
            }
          </p>
        </article>

        <article className="draftV2Recommendations">
          <header><span className="eyebrow">Your board</span><h2>Top recommendations</h2></header>
          {recommendations.slice(0,5).map((row,index)=>
            <button
              key={row.player.name}
              disabled={!userOnClock}
              onClick={()=>setSelectedPlayer(row.player)}
            >
              <span>{index+1}</span>
              <div>
                <b>{row.player.name}</b>
                <small>
                  {row.player.position} • PPR {row.player.pprRank}
                  {row.player.position==="QB"?` → OKFL ${pprAdjustedRank(row.player)}`:""}
                </small>
              </div>
              <strong>{Math.round(row.score)}</strong>
            </button>
          )}
        </article>

        <article className="draftV2Recent">
          <header><span className="eyebrow">Draft feed</span><h2>Recent picks</h2></header>
          {recentPicks.map((pick)=>
            <div key={pick.overall}>
              <span>{pick.round}.{pick.slot}</span>
              <div><b>{pick.player.name}</b><small>{pick.manager} • {pick.grade}</small></div>
            </div>
          )}
          {!recentPicks.length&&<p>No live selections yet.</p>}
        </article>
      </aside>
    </div>

    <section className="draftV2Workspace">
      <div className="draftV2Tabs">
        <button className={activePanel==="players"?"active":""} onClick={()=>setActivePanel("players")}>Available Players</button>
        <button className={activePanel==="roster"?"active":""} onClick={()=>setActivePanel("roster")}>{controlledManager.manager} Roster</button>
        <button className={activePanel==="intel"?"active":""} onClick={()=>setActivePanel("intel")}>Manager Intel</button>
      </div>

      {activePanel==="players"&&
        <div className="draftV2Players">
          <header>
            <div>
              <select value={position} onChange={(event)=>setPosition(event.target.value)}>
                {["ALL","QB","RB","WR","TE"].map((value)=><option key={value}>{value}</option>)}
              </select>
              <input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search player"/>
            </div>
            <span>{available.length} players available</span>
          </header>

          <div className="draftV2PlayerGrid">
            {filteredPlayers.map((player)=>{
              const recommendation=recommendations.find((row)=>row.player.name===player.name);
              return <button
                className={selectedPlayer?.name===player.name?"selected":""}
                key={player.name}
                disabled={!userOnClock}
                onClick={()=>setSelectedPlayer(player)}
              >
                <div className={`playerPosition ${positionClass[player.position]||""}`}>{player.position}</div>
                <div className="playerCardIdentity">
                  <b>{player.name}</b>
                  <span>{player.team} • Age {player.age||"—"}</span>
                </div>
                <div className="playerRanks">
                  <span>PPR <b>{player.pprRank}</b></span>
                  <span>OKFL <b>{pprAdjustedRank(player)}</b></span>
                </div>
                <strong>{recommendation?Math.round(recommendation.score):Math.round(pprAdjustedValue(player))}</strong>
              </button>
            })}
          </div>
        </div>
      }

      {activePanel==="roster"&&
        <div className="draftV2Roster">
          {["QB","RB","WR","TE"].map((pos)=>
            <section key={pos}>
              <header><b>{pos}</b><span>{controlledRoster.filter((pick)=>pick.player.position===pos).length}</span></header>
              {controlledRoster.filter((pick)=>pick.player.position===pos).map((pick)=>
                <div key={`${pick.overall}-${pick.player.name}`}>
                  <b>{pick.player.name}</b>
                  <span>{pick.keeper?`Keeper • Round ${pick.keeperCost}`:`Pick ${pick.round}.${pick.slot} • ${pick.grade}`}</span>
                </div>
              )}
              {!controlledRoster.some((pick)=>pick.player.position===pos)&&<p>No players yet.</p>}
            </section>
          )}
        </div>
      }

      {activePanel==="intel"&&
        <div className="draftV2Intel">
          {managers.map((manager)=>
            <article className={manager.franchiseId===controlledFranchise?"controlled":""} key={manager.franchiseId}>
              <span>Pick {manager.slot}</span>
              <h3>{manager.manager}</h3>
              <b>{manager.archetype}</b>
              <p>{manager.motto}</p>
              <div>
                <small>QB {Math.round(manager.tendencies.qbAggression*100)}</small>
                <small>Youth {Math.round(manager.tendencies.youth*100)}</small>
                <small>Risk {Math.round(manager.tendencies.risk*100)}</small>
              </div>
            </article>
          )}
        </div>
      }
    </section>

    {selectedPlayer&&userOnClock&&
      <div className="draftV2SelectionBar">
        <div className={`selectionPosition ${positionClass[selectedPlayer.position]||""}`}>{selectedPlayer.position}</div>
        <div>
          <span>Selected player</span>
          <b>{selectedPlayer.name}</b>
          <small>
            PPR rank {selectedPlayer.pprRank} • OKFL-adjusted rank {pprAdjustedRank(selectedPlayer)}
          </small>
        </div>
        <button onClick={()=>setSelectedPlayer(null)}>Cancel</button>
        <button className="draftPlayerButton" onClick={()=>makeUserPick(selectedPlayer)}>
          Draft {selectedPlayer.name}
        </button>
      </div>
    }
  </Page>
}
