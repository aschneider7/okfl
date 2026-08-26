-- OKFL OS 9.4.0 — final 2026 keeper board imported from Sleeper draft 1381102523594604544.
-- Replaces the preseason tentative board, submits all ten franchises, and locks the official board.

begin;

delete from public.keeper_eligibility where season=2026;

with official(franchise_id,player,position,round,note) as (values
  ('F01','Ladd McConkey','WR',5,'Sleeper pick 5.6'),
  ('F01','Trevor Lawrence','QB',10,'Sleeper pick 10.6'),
  ('F01','Chase Brown','RB',12,'Sleeper pick 12.6'),
  ('F02','Colston Loveland','TE',10,'Sleeper pick 10.1'),
  ('F02','Puka Nacua','WR',12,'Sleeper pick 12.1'),
  ('F02','Bucky Irving','RB',13,'Sleeper pick 13.1'),
  ('F03','Emeka Egbuka','WR',4,'Sleeper pick 4.8'),
  ('F03','Travis Etienne','RB',10,'Sleeper pick 10.8'),
  ('F03','Kyren Williams','RB',12,'Sleeper pick 12.8'),
  ('F04','George Pickens','WR',4,'Sleeper pick 4.2'),
  ('F04','Jaxon Smith-Njigba','WR',11,'Sleeper pick 11.2'),
  ('F04','Ka''imi Fairbairn','K',14,'Sleeper pick 14.2'),
  ('F05','Brock Bowers','TE',4,'Sleeper pick 4.3'),
  ('F05','Chris Olave','WR',6,'Sleeper pick 6.3'),
  ('F05','Jaxson Dart','QB',14,'Sleeper pick 14.3'),
  ('F06','Jonathan Taylor','RB',3,'Sleeper pick 3.7'),
  ('F06','Tetairoa McMillan','WR',4,'Sleeper pick 4.7'),
  ('F06','Jaylen Waddle','WR',6,'Sleeper pick 6.7'),
  ('F07','Cam Skattebo','RB',8,'Sleeper pick 8.10'),
  ('F07','Sam Darnold','QB',13,'Sleeper pick 13.10'),
  ('F07','Alec Pierce','WR',14,'Sleeper pick 14.10'),
  ('F08','Rashee Rice','WR',5,'Sleeper pick 5.5'),
  ('F08','Drake Maye','QB',7,'Sleeper pick 7.5'),
  ('F08','De''Von Achane','RB',9,'Sleeper pick 9.5'),
  ('F09','Malik Nabers','WR',3,'Sleeper pick 3.4'),
  ('F09','Caleb Williams','QB',5,'Sleeper pick 5.4'),
  ('F09','James Cook','RB',6,'Sleeper pick 6.4'),
  ('F10','Trey McBride','TE',4,'Sleeper pick 4.9'),
  ('F10','Christian Watson','WR',13,'Sleeper pick 13.9'),
  ('F10','Wan''Dale Robinson','WR',14,'Sleeper pick 14.9')
)
insert into public.keeper_eligibility(
  season,franchise_id,player_key,player,position,round,
  roster_verified,cost_verified,pick_verified,eligible,source,note,updated_at
)
select 2026,franchise_id,regexp_replace(lower(player),'[^a-z0-9]+','','g'),player,position,round,
  true,true,true,true,'Sleeper 2026 official keeper board',note,now()
from official;

with official(franchise_id,choices) as (values
  ('F01','[{"player":"Ladd McConkey","position":"WR","round":5},{"player":"Trevor Lawrence","position":"QB","round":10},{"player":"Chase Brown","position":"RB","round":12}]'::jsonb),
  ('F02','[{"player":"Colston Loveland","position":"TE","round":10},{"player":"Puka Nacua","position":"WR","round":12},{"player":"Bucky Irving","position":"RB","round":13}]'::jsonb),
  ('F03','[{"player":"Emeka Egbuka","position":"WR","round":4},{"player":"Travis Etienne","position":"RB","round":10},{"player":"Kyren Williams","position":"RB","round":12}]'::jsonb),
  ('F04','[{"player":"George Pickens","position":"WR","round":4},{"player":"Jaxon Smith-Njigba","position":"WR","round":11},{"player":"Ka''imi Fairbairn","position":"K","round":14}]'::jsonb),
  ('F05','[{"player":"Brock Bowers","position":"TE","round":4},{"player":"Chris Olave","position":"WR","round":6},{"player":"Jaxson Dart","position":"QB","round":14}]'::jsonb),
  ('F06','[{"player":"Jonathan Taylor","position":"RB","round":3},{"player":"Tetairoa McMillan","position":"WR","round":4},{"player":"Jaylen Waddle","position":"WR","round":6}]'::jsonb),
  ('F07','[{"player":"Cam Skattebo","position":"RB","round":8},{"player":"Sam Darnold","position":"QB","round":13},{"player":"Alec Pierce","position":"WR","round":14}]'::jsonb),
  ('F08','[{"player":"Rashee Rice","position":"WR","round":5},{"player":"Drake Maye","position":"QB","round":7},{"player":"De''Von Achane","position":"RB","round":9}]'::jsonb),
  ('F09','[{"player":"Malik Nabers","position":"WR","round":3},{"player":"Caleb Williams","position":"QB","round":5},{"player":"James Cook","position":"RB","round":6}]'::jsonb),
  ('F10','[{"player":"Trey McBride","position":"TE","round":4},{"player":"Christian Watson","position":"WR","round":13},{"player":"Wan''Dale Robinson","position":"WR","round":14}]'::jsonb)
)
insert into public.keeper_submissions(
  season,franchise_id,user_id,choices,status,revision,changed_after_submission,submitted_at,updated_at
)
select 2026,official.franchise_id,account.user_id,official.choices,'submitted',1,false,now(),now()
from official
join public.franchise_accounts account using(franchise_id)
on conflict (season,franchise_id) do update set
  user_id=excluded.user_id,
  choices=excluded.choices,
  status='submitted',
  revision=public.keeper_submissions.revision+1,
  changed_after_submission=false,
  submitted_at=now(),
  updated_at=now();

do $$
begin
  if (select count(*) from public.keeper_submissions where season=2026 and status='submitted') <> 10 then
    raise exception 'Official keeper import did not produce ten submitted franchises';
  end if;
  if (select coalesce(sum(jsonb_array_length(choices)),0) from public.keeper_submissions where season=2026) <> 30 then
    raise exception 'Official keeper import did not produce thirty selections';
  end if;
  if (select count(*) from public.keeper_eligibility where season=2026 and eligible and roster_verified and cost_verified and pick_verified) <> 30 then
    raise exception 'Official keeper certification did not produce thirty verified selections';
  end if;
end $$;

insert into public.keeper_submission_events(submission_id,actor_user_id,action,revision,choices)
select submission.id,commissioner.user_id,'submitted',submission.revision,submission.choices
from public.keeper_submissions submission
cross join lateral (
  select user_id from public.franchise_accounts
  where franchise_id='F01' and role='commissioner' and must_change_password=false
  limit 1
) commissioner
where submission.season=2026;

update public.keeper_submissions set status='locked',updated_at=now() where season=2026;

update public.keeper_windows
set status='locked',deadline=null,locked_at=now(),
    locked_by=(select user_id from public.franchise_accounts where franchise_id='F01' and role='commissioner' limit 1),
    updated_at=now()
where season=2026;

insert into public.keeper_submission_events(submission_id,actor_user_id,action,revision,choices)
select submission.id,commissioner.user_id,'locked',submission.revision,submission.choices
from public.keeper_submissions submission
cross join lateral (
  select user_id from public.franchise_accounts
  where franchise_id='F01' and role='commissioner' and must_change_password=false
  limit 1
) commissioner
where submission.season=2026;

insert into public.commissioner_audit_log(
  league_id,season,action,entity_type,entity_key,before_data,after_data,note
)
values(
  'okfl',2026,'lock_sleeper_keeper_board','keeper_board','2026',null,
  jsonb_build_object('draft_id','1381102523594604544','franchises',10,'keepers',30,'status','locked'),
  'Imported the final keeper board from Sleeper and removed the preseason tentative selections.'
);

commit;
