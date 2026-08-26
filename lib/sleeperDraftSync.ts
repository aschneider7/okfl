export function sleeperDraftPicks(drafts:any[]=[]){
  return drafts.flatMap((draft:any)=>(draft.picks??draft.raw?.picks??[]).map((pick:any)=>({
    ...pick,
    draft_id:pick.draft_id??draft.draft_id,
    draft_status:draft.status??draft.raw?.status??null,
    draft_season:Number(draft.season??draft.raw?.season??2026),
  })));
}

export function sleeperDraftSyncSummary(drafts:any[]=[],rosters:any[]=[]){
  const picks=sleeperDraftPicks(drafts);
  const completedDrafts=drafts.filter((draft:any)=>(draft.status??draft.raw?.status)==="complete");
  const expectedPicks=drafts.reduce((maximum:number,draft:any)=>{
    const settings=draft.settings??draft.raw?.settings??{};
    return Math.max(maximum,Number(settings.rounds||0)*Number(settings.teams||rosters.length||0));
  },0);
  const rosterPlayerCount=rosters.reduce((sum:number,roster:any)=>sum+(roster.players??roster.raw?.players??[]).length,0);
  return {
    draft_pick_count:picks.length,
    mapped_draft_picks:picks.filter((pick:any)=>pick.franchise_id).length,
    expected_draft_picks:expectedPicks,
    completed_drafts:completedDrafts.length,
    populated_rosters:rosters.filter((roster:any)=>(roster.players??roster.raw?.players??[]).length>0).length,
    roster_player_count:rosterPlayerCount,
    post_draft_ready:completedDrafts.length>0&&picks.length===expectedPicks&&picks.every((pick:any)=>pick.franchise_id)&&rosters.length===10&&rosters.every((roster:any)=>(roster.players??roster.raw?.players??[]).length>0),
  };
}

export function sleeperDraftArchiveRows(snapshot:any,franchises:any[]=[]){
  const franchiseNames=new Map(franchises.map((franchise:any)=>[franchise.id,franchise.name]));
  return sleeperDraftPicks(snapshot?.drafts??[]).filter((pick:any)=>pick.franchise_id).map((pick:any)=>{
    const metadata=pick.metadata??{};
    const player=metadata.full_name||[metadata.first_name,metadata.last_name].filter(Boolean).join(" ")||metadata.player_name||String(pick.player_id||"Unknown player");
    return {
      season:Number(pick.draft_season||2026),
      overall_num:Number(pick.pick_no||0),
      round_num:Number(pick.round||0),
      franchise_id:String(pick.franchise_id),
      franchise:franchiseNames.get(String(pick.franchise_id))||String(pick.franchise_id),
      player,
      position:String(metadata.position||""),
      nfl_team:String(metadata.team||""),
      tracked_future_points:0,
      keeper_years_created:0,
      championships_created:0,
      current:true,
      is_keeper:pick.is_keeper===true||Number(pick.is_keeper)===1,
      draft_status:pick.draft_status,
    };
  }).sort((a:any,b:any)=>a.overall_num-b.overall_num);
}
