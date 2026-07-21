export type SearchResult = {
  id:string;
  group:string;
  title:string;
  detail:string;
  href?:string;
  year?:number;
  score:number;
  icon:string;
  preview?:{label:string;value:string}[];
};

export type SearchAnswer = {
  eyebrow:string;
  title:string;
  summary:string;
  heroValue?:string;
  heroLabel?:string;
  stats?:{label:string;value:string}[];
  href?:string;
  hrefLabel?:string;
  timeline?:{year:string;label:string;detail:string}[];
};

export const normalize=(value:string)=>value.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9' ]/g,' ').replace(/\\s+/g,' ').trim();

export function fuzzy(candidateRaw:string,queryRaw:string){
 const candidate=normalize(candidateRaw),query=normalize(queryRaw);
 if(!query)return 1;if(candidate===query)return 100;if(candidate.startsWith(query))return 91-Math.min(18,candidate.length-query.length);
 if(candidate.includes(query))return 73-Math.min(20,candidate.indexOf(query));
 const q=query.split(' ').filter(Boolean),c=candidate.split(' ').filter(Boolean);
 const overlap=q.filter(token=>c.some(word=>word.startsWith(token)||token.startsWith(word))).length;
 let sequence=0,index=0;for(const char of query){const at=candidate.indexOf(char,index);if(at>=0){sequence++;index=at+1}}
 return overlap*24+(sequence/Math.max(1,query.length))*18;
}

function franchise(data:any,term:string){return data.franchises.map((row:any)=>({row,score:fuzzy(`${row.name} ${row.display_name} ${row.current_manager} ${row.original_manager}`,term)})).sort((a:any,b:any)=>b.score-a.score)[0]}
function player(data:any,term:string){return data.players.map((row:any)=>({row,score:fuzzy(row.name,term)})).sort((a:any,b:any)=>b.score-a.score)[0]}
function playerTotals(row:any){return {points:(row.season_stats||[]).reduce((sum:number,s:any)=>sum+Number(s.points||0),0),owners:[...new Set((row.events||[]).map((e:any)=>e.franchise).filter(Boolean))] as string[],keepers:(row.events||[]).filter((e:any)=>e.type==='Keeper').length,trades:(row.trades||[]).length}}

export function buildIndex(data:any):SearchResult[]{
 const rows:SearchResult[]=[];
 data.franchises.forEach((f:any)=>{const m=data.franchise_metrics.find((x:any)=>x.franchise_id===f.id);rows.push({id:`f-${f.id}`,group:'Franchises',title:f.name,detail:`${f.current_manager} • ${m.wins}-${m.losses} (${Number(m.win_pct).toFixed(1)}%)`,href:`/franchises/${f.id}`,score:0,icon:'F',preview:[{label:'PF',value:Number(m.pf).toFixed(1)},{label:'Titles',value:String(m.championships)},{label:'Legacy',value:String(m.legacy_score)}]})});
 data.players.forEach((p:any)=>{const t=playerTotals(p);rows.push({id:`p-${p.name}`,group:'Players',title:p.name,detail:`${(p.positions||[]).join('/')||'Player'} • ${t.points.toFixed(1)} tracked pts • ${t.owners.length} owners`,href:`/?q=${encodeURIComponent(p.name)}`,score:0,icon:'P',preview:[{label:'Owners',value:String(t.owners.length)},{label:'Trades',value:String(t.trades)},{label:'Titles',value:String(p.championships||0)}]})});
 [2021,2022,2023,2024,2025,2026].forEach(year=>rows.push({id:`s-${year}`,group:'Seasons',title:`${year} OKFL season`,detail:'Standings, trades, drafts and historical results',href:`/time-machine?year=${year}`,year,score:0,icon:'Y'}));
 [{id:'live',title:'Live League Dashboard',detail:'2026 standings, matchups, awards, and activity',href:'/live-league',keywords:'live dashboard standings matchups weekly sleeper'},{id:'recap',title:'Weekly League Recap',detail:'Automatic game stories, superlatives, and weekly leaders',href:'/weekly-recap',keywords:'weekly recap story game of week player manager'},{id:'awards',title:'League Awards Race',detail:'Live player, manager, and GM award rankings',href:'/league-awards',keywords:'awards race mvp manager gm player rankings'},{id:'odds',title:'Playoff Odds Simulator',detail:'Live playoff, bye, seed, and championship probabilities',href:'/playoff-odds',keywords:'playoff odds simulator postseason probability'},{id:'power',title:'Power Rankings',detail:'Live 2026 model, movement and team scorecards',href:'/power-rankings',keywords:'power rankings teams contender live'},{id:'records',title:'Records Center',detail:'Championships, PF, PA and weekly records',href:'/records',keywords:'records highest scoring championships legacy'},{id:'trades',title:'Trade Explorer',detail:'Every completed deal and trade analysis',href:'/trades',keywords:'trades deals fleece'},{id:'drafts',title:'Draft Center',detail:'Draft history, grades and pick value',href:'/drafts',keywords:'draft grades picks rounds'},{id:'keepers',title:'Keeper Center',detail:'Keeper history, cost and eligibility',href:'/keepers',keywords:'keepers cost eligibility'},{id:'compare',title:'Franchise Compare',detail:'Head-to-head and career comparisons',href:'/compare',keywords:'compare versus head to head'}].forEach((x:any)=>rows.push({...x,group:'Destinations',score:0,icon:'→'}));
 return rows;
}

export function suggestions(data:any,query:string,limit=16){const q=normalize(query);if(!q)return buildIndex(data).filter(x=>x.group==='Destinations').slice(0,8);return buildIndex(data).map(row=>({...row,score:fuzzy(`${row.title} ${row.detail} ${(row as any).keywords||''}`,q)})).filter(row=>row.score>=25).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title)).slice(0,limit)}

export function answerQuery(data:any,raw:string):SearchAnswer|null{
 const q=normalize(raw);if(!q)return null;
 let match=raw.match(/^who owned (.+?)[?]?$/i);if(match){const best=player(data,match[1]);if(best?.score>=25){const p=best.row;const events=(p.events||[]).filter((e:any)=>e.franchise).sort((a:any,b:any)=>(a.season||0)-(b.season||0));const unique=[...new Map(events.map((e:any)=>[`${e.season}-${e.franchise}`,e])).values()] as any[];return{eyebrow:'Ownership answer',title:`Who owned ${p.name}?`,summary:unique.length?`${p.name} has appeared with ${[...new Set(unique.map(e=>e.franchise))].join(', ')} in the tracked OKFL archive.`:'No ownership events were found.',stats:[{label:'Owners',value:String(new Set(unique.map(e=>e.franchise)).size)},{label:'Transactions',value:String(events.length)},{label:'Trades',value:String((p.trades||[]).length)},{label:'Championships',value:String(p.championships||0)}],timeline:unique.slice(-10).map(e=>({year:String(e.season),label:e.franchise,detail:e.detail||e.type}))}}}
 match=raw.match(/^who drafted (.+?)[?]?$/i);if(match){const picks=data.draft_picks.filter((x:any)=>fuzzy(x.player,match![1])>=40).sort((a:any,b:any)=>a.season-b.season);if(picks.length){const p=picks[0];return{eyebrow:'Draft answer',title:`${p.player} was drafted by ${p.franchise}`,summary:`Selected in Round ${p.round_num} with overall pick ${p.overall_num} in ${p.season}.`,heroValue:`${p.round_num}.${p.overall_num}`,heroLabel:'Round • Overall',stats:[{label:'Future points',value:Number(p.tracked_future_points||0).toFixed(1)},{label:'Keeper years',value:String(p.keeper_years_created||0)},{label:'Titles created',value:String(p.championships_created||0)}],href:`/drafts?year=${p.season}`,hrefLabel:'Open that draft'}}}
 const vs=raw.split(/\\s+(?:vs\\.?|versus)\\s+/i);if(vs.length===2){const a=franchise(data,vs[0]),b=franchise(data,vs[1]);if(a?.score>=25&&b?.score>=25&&a.row.id!==b.row.id){const games=data.weekly_games.filter((g:any)=>g.franchise_id===a.row.id&&g.opponent_id===b.row.id);const wins=games.filter((g:any)=>g.result==='W').length,losses=games.filter((g:any)=>g.result==='L').length,ties=games.length-wins-losses;const pf=games.reduce((s:number,g:any)=>s+Number(g.score),0),pa=games.reduce((s:number,g:any)=>s+Number(g.opp_score),0);return{eyebrow:'Head-to-head answer',title:`${a.row.name} vs ${b.row.name}`,summary:`${a.row.name} is ${wins}-${losses}${ties?`-${ties}`:''} in ${games.length} tracked meetings against ${b.row.name}.`,heroValue:`${wins}-${losses}`,heroLabel:`${a.row.name} record`,stats:[{label:'Meetings',value:String(games.length)},{label:`${a.row.name} avg`,value:games.length?(pf/games.length).toFixed(1):'—'},{label:`${b.row.name} avg`,value:games.length?(pa/games.length).toFixed(1):'—'},{label:'Playoff games',value:String(games.filter((g:any)=>g.playoff).length)}],href:`/compare?a=${a.row.id}&b=${b.row.id}`,hrefLabel:'Open full comparison'}}}
 if(/most traded players|most trades/.test(q)){const ranked=data.players.map((p:any)=>({p,count:(p.trades||[]).length})).filter((x:any)=>x.count).sort((a:any,b:any)=>b.count-a.count).slice(0,8);return{eyebrow:'League record',title:'Most traded players',summary:'Ranked by distinct tracked OKFL trade deals.',heroValue:String(ranked[0]?.count||0),heroLabel:`${ranked[0]?.p.name||'No player'} trades`,timeline:ranked.map((x:any,i:number)=>({year:`#${i+1}`,label:x.p.name,detail:`${x.count} trades`}))}}
 if(/highest score|highest scoring week|single week record/.test(q)){const game=[...data.weekly_games].sort((a:any,b:any)=>Number(b.score)-Number(a.score))[0];return{eyebrow:'League record',title:'Highest tracked weekly score',summary:`${game.franchise} scored ${Number(game.score).toFixed(2)} against ${game.opponent} in Week ${game.week} of ${game.season}.`,heroValue:Number(game.score).toFixed(2),heroLabel:'Fantasy points',stats:[{label:'Season',value:String(game.season)},{label:'Week',value:String(game.week)},{label:'Margin',value:`${Number(game.margin)>=0?'+':''}${Number(game.margin).toFixed(2)}`},{label:'Opponent',value:game.opponent}],href:'/records',hrefLabel:'Open Records Center'}}
 if(/championship leaders|most championships|who has the most titles/.test(q)){const ranked=[...data.franchise_metrics].sort((a:any,b:any)=>b.championships-a.championships||b.legacy_score-a.legacy_score);return{eyebrow:'Championship answer',title:'OKFL championship leaders',summary:`${ranked[0].franchise} leads with ${ranked[0].championships} championship${ranked[0].championships===1?'':'s'}.`,heroValue:String(ranked[0].championships),heroLabel:`${ranked[0].franchise} titles`,timeline:ranked.slice(0,6).map((x:any,i:number)=>({year:`#${i+1}`,label:x.franchise,detail:`${x.championships} titles • ${x.runner_ups} runner-ups`})),href:'/records',hrefLabel:'Open championship history'}}
 const season=raw.match(/\\b(202[1-6])\\b/);if(season&&(/season|standings|year/.test(q)||q===season[1])){const y=Number(season[1]);const standings=data.regular_standings.filter((x:any)=>x.season===y).sort((a:any,b:any)=>a.rank-b.rank);const champion=data.championship_history.find((x:any)=>x.season===y);return{eyebrow:'Season answer',title:`${y} OKFL season`,summary:champion?`${champion.manager} won the ${y} championship. ${standings[0]?.franchise||'The regular-season leader'} finished first in the regular season.`:'Current season data updates through Sleeper.',heroValue:champion?.manager||'Live',heroLabel:champion?'Champion':'Season status',timeline:standings.slice(0,6).map((x:any)=>({year:`#${x.rank}`,label:x.franchise,detail:`${x.record} • ${x.points?`${Number(x.points).toFixed(1)} PF`:'record verified'}`})),href:`/time-machine?year=${y}`,hrefLabel:'Open season archive'}}
 const f=franchise(data,raw);if(f?.score>=52){const m=data.franchise_metrics.find((x:any)=>x.franchise_id===f.row.id);return{eyebrow:'Franchise answer',title:f.row.name,summary:`Managed by ${f.row.current_manager}. ${m.championships} title${m.championships===1?'':'s'}, ${m.runner_ups} runner-up finish${m.runner_ups===1?'':'es'}, and a ${Number(m.win_pct).toFixed(1)}% all-time win rate.`,heroValue:`${m.wins}-${m.losses}`,heroLabel:'All-time record',stats:[{label:'Win %',value:`${Number(m.win_pct).toFixed(1)}%`},{label:'PF',value:Number(m.pf).toFixed(1)},{label:'Avg finish',value:String(m.average_finish)},{label:'Legacy',value:String(m.legacy_score)}],href:`/franchises/${f.row.id}`,hrefLabel:'Open scouting report'}}
 const p=player(data,raw);if(p?.score>=52){const t=playerTotals(p.row);return{eyebrow:'Player answer',title:p.row.name,summary:`${(p.row.positions||[]).join('/')||'Player'} with ${t.points.toFixed(1)} tracked OKFL points across ${p.row.rostered_seasons?.length||0} seasons.`,heroValue:t.points.toFixed(1),heroLabel:'Tracked OKFL points',stats:[{label:'Owners',value:String(t.owners.length)},{label:'Trades',value:String(t.trades)},{label:'Keepers',value:String(t.keepers)},{label:'Titles',value:String(p.row.championships||0)}],timeline:(p.row.season_stats||[]).sort((a:any,b:any)=>a.season-b.season).map((s:any)=>({year:String(s.season),label:s.franchise,detail:`${Number(s.points).toFixed(1)} points • ${s.starts} starts`}))}}
 return null;
}
