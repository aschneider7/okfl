import assert from "node:assert/strict";
import {sleeperDraftArchiveRows,sleeperDraftSyncSummary} from "../lib/sleeperDraftSync.ts";

const franchises=Array.from({length:10},(_,index)=>({id:`F${String(index+1).padStart(2,"0")}`,name:`Team ${index+1}`}));
const rosters=franchises.map((franchise,index)=>({
  franchise_id:franchise.id,
  players:Array.from({length:17},(_,player)=>`player-${index}-${player}`),
}));
const picks=Array.from({length:170},(_,index)=>({
  pick_no:index+1,
  round:Math.floor(index/10)+1,
  roster_id:(index%10)+1,
  franchise_id:franchises[index%10].id,
  player_id:`player-${index}`,
  is_keeper:index<30?1:0,
  metadata:{first_name:"Player",last_name:String(index+1),position:index%2?"WR":"RB",team:"OKF"},
}));
const completedDraft={draft_id:"draft-2026",season:"2026",status:"complete",settings:{rounds:17,teams:10},picks};

const complete=sleeperDraftSyncSummary([completedDraft],rosters);
assert.equal(complete.draft_pick_count,170);
assert.equal(complete.mapped_draft_picks,170);
assert.equal(complete.expected_draft_picks,170);
assert.equal(complete.completed_drafts,1);
assert.equal(complete.populated_rosters,10);
assert.equal(complete.roster_player_count,170);
assert.equal(complete.post_draft_ready,true);

const live=sleeperDraftSyncSummary([{...completedDraft,status:"drafting",picks:picks.slice(0,42)}],rosters);
assert.equal(live.draft_pick_count,42);
assert.equal(live.post_draft_ready,false);

const missingMapping=sleeperDraftSyncSummary([{...completedDraft,picks:picks.map((pick,index)=>index===169?{...pick,franchise_id:null}:pick)}],rosters);
assert.equal(missingMapping.mapped_draft_picks,169);
assert.equal(missingMapping.post_draft_ready,false);

const rows=sleeperDraftArchiveRows({drafts:[completedDraft]},franchises);
assert.equal(rows.length,170);
assert.equal(rows[0].player,"Player 1");
assert.equal(rows[0].franchise,"Team 1");
assert.equal(rows[0].is_keeper,true);
assert.equal(rows[30].is_keeper,false);
assert.equal(rows[169].overall_num,170);

console.log("Sleeper draft sync validation passed.");
