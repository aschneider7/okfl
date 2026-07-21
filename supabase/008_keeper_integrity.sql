-- OKFL OS 7.4.0 — certified keeper eligibility and atomic board operations.
-- Run after 006_official_keepers_and_auth_draft.sql. Safe to run repeatedly.

create table if not exists public.keeper_eligibility (
  season integer not null references public.keeper_windows(season) on delete cascade,
  franchise_id text not null references public.franchises(id) on delete cascade,
  player_key text not null,
  player text not null,
  position text not null check (position in ('QB','RB','WR','TE','K','DEF')),
  round integer not null check (round between 1 and 17),
  roster_verified boolean not null default false,
  cost_verified boolean not null default false,
  pick_verified boolean not null default false,
  eligible boolean not null default true,
  source text not null default 'commissioner',
  note text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (season, franchise_id, player_key),
  check (player_key = regexp_replace(lower(player), '[^a-z0-9]+', '', 'g'))
);

create index if not exists idx_keeper_eligibility_team
  on public.keeper_eligibility(season, franchise_id, eligible, round);
alter table public.keeper_eligibility enable row level security;

with seed(franchise_id,player,position,round) as (values
  ('F02','Colston Loveland','TE',10),('F02','Puka Nacua','WR',12),('F02','Luther Burden III','WR',13),
  ('F04','George Pickens','WR',4),('F04','Jameson Williams','WR',5),('F04','Jaxon Smith-Njigba','WR',11),
  ('F05','Brock Bowers','TE',4),('F05','Chris Olave','WR',6),('F05','Jaxson Dart','QB',14),
  ('F09','Malik Nabers','WR',3),('F09','James Cook','RB',6),('F09','Javonte Williams','RB',10),
  ('F08','Rashee Rice','WR',5),('F08','Drake Maye','QB',7),('F08','De''Von Achane','RB',9),
  ('F01','Ladd McConkey','WR',5),('F01','Trevor Lawrence','QB',10),('F01','Chase Brown','RB',12),
  ('F06','Jonathan Taylor','RB',3),('F06','Tetairoa McMillan','WR',4),('F06','Jaylen Waddle','WR',6),
  ('F03','Rome Odunze','WR',7),('F03','Travis Etienne Jr.','RB',10),('F03','Kyren Williams','RB',12),
  ('F10','Trey McBride','TE',4),('F10','Wan''Dale Robinson','WR',13),('F10','Daniel Jones','QB',14),
  ('F07','Cam Skattebo','RB',8),('F07','Sam Darnold','QB',13),('F07','Dallas Goedert','TE',15)
)
insert into public.keeper_eligibility(
  season,franchise_id,player_key,player,position,round,
  roster_verified,cost_verified,pick_verified,eligible,source
)
select 2026,franchise_id,regexp_replace(lower(player),'[^a-z0-9]+','','g'),player,position,round,
  true,true,true,true,'2026 commissioner-certified board'
from seed
on conflict (season,franchise_id,player_key) do nothing;

create or replace function public.save_official_keeper_submission(
  p_user_id uuid,
  p_franchise_id text,
  p_choices jsonb,
  p_action text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window public.keeper_windows%rowtype;
  v_existing public.keeper_submissions%rowtype;
  v_submission public.keeper_submissions%rowtype;
  v_choices jsonb;
  v_choice jsonb;
  v_count integer;
  v_has_existing boolean;
  v_changed boolean;
  v_was_submitted boolean;
  v_revision integer;
  v_status text;
  v_event text;
  v_now timestamptz := now();
begin
  if p_action not in ('save','submit') then raise exception 'Unknown keeper action'; end if;
  if not exists (
    select 1 from public.franchise_accounts
    where user_id=p_user_id and franchise_id=p_franchise_id and must_change_password=false
  ) then raise exception 'Verified franchise account required'; end if;
  if jsonb_typeof(coalesce(p_choices,'[]'::jsonb)) <> 'array' then raise exception 'Keeper choices must be an array'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'player',trim(choice.value->>'player'),
    'position',upper(trim(choice.value->>'position')),
    'round',coalesce((choice.value->>'round')::integer,0)
  ) order by choice.ordinality),'[]'::jsonb)
  into v_choices
  from jsonb_array_elements(p_choices) with ordinality as choice(value,ordinality)
  where trim(coalesce(choice.value->>'player','')) <> '';

  v_count := jsonb_array_length(v_choices);
  if v_count > 3 then raise exception 'A franchise may submit no more than three keepers'; end if;
  if p_action='submit' and v_count <> 3 then raise exception 'Select exactly three certified keepers'; end if;

  select * into v_window from public.keeper_windows where season=2026 for update;
  if not found then raise exception 'Official keeper window is not installed'; end if;
  if v_window.status <> 'open' then raise exception 'The official keeper board is locked'; end if;
  if v_window.deadline is not null and v_window.deadline <= v_now then raise exception 'The keeper deadline has passed'; end if;

  if p_action='submit' then
    for v_choice in select value from jsonb_array_elements(v_choices)
    loop
      if not exists (
        select 1 from public.keeper_eligibility eligibility
        where eligibility.season=2026
          and eligibility.franchise_id=p_franchise_id
          and eligibility.player_key=regexp_replace(lower(v_choice->>'player'),'[^a-z0-9]+','','g')
          and eligibility.position=upper(v_choice->>'position')
          and eligibility.round=(v_choice->>'round')::integer
          and eligibility.eligible and eligibility.roster_verified
          and eligibility.cost_verified and eligibility.pick_verified
      ) then raise exception '% is not certified for that franchise, position, and keeper cost', v_choice->>'player'; end if;
    end loop;
    if (select count(distinct regexp_replace(lower(value->>'player'),'[^a-z0-9]+','','g')) from jsonb_array_elements(v_choices)) <> v_count
      then raise exception 'A player can only be submitted once'; end if;
    if (select count(distinct (value->>'round')::integer) from jsonb_array_elements(v_choices)) <> v_count
      then raise exception 'Two keepers cannot use the same round cost'; end if;
    if exists (
      select 1
      from public.keeper_submissions submission
      cross join lateral jsonb_array_elements(submission.choices) other_choice
      where submission.season=2026 and submission.franchise_id<>p_franchise_id
        and submission.status in ('submitted','locked')
        and exists (
          select 1 from jsonb_array_elements(v_choices) current_choice
          where regexp_replace(lower(current_choice->>'player'),'[^a-z0-9]+','','g')=
                regexp_replace(lower(other_choice->>'player'),'[^a-z0-9]+','','g')
        )
    ) then raise exception 'A selected player is already submitted by another franchise'; end if;
  end if;

  select * into v_existing from public.keeper_submissions
    where season=2026 and franchise_id=p_franchise_id for update;
  v_has_existing := found;
  v_changed := not v_has_existing or v_existing.choices is distinct from v_choices;
  v_was_submitted := v_existing.submitted_at is not null;
  v_revision := coalesce(v_existing.revision,0) + case when v_changed or p_action='submit' then 1 else 0 end;
  v_status := case when p_action='submit' then 'submitted' when v_was_submitted and v_changed then 'draft' else coalesce(v_existing.status,'draft') end;

  insert into public.keeper_submissions(
    season,franchise_id,user_id,choices,status,revision,changed_after_submission,submitted_at,updated_at
  ) values (
    2026,p_franchise_id,p_user_id,v_choices,v_status,v_revision,
    coalesce(v_existing.changed_after_submission,false) or (v_was_submitted and v_changed),
    case when p_action='submit' then v_now else v_existing.submitted_at end,v_now
  ) on conflict (season,franchise_id) do update set
    user_id=excluded.user_id,choices=excluded.choices,status=excluded.status,revision=excluded.revision,
    changed_after_submission=excluded.changed_after_submission,submitted_at=excluded.submitted_at,updated_at=excluded.updated_at
  returning * into v_submission;

  if v_changed or p_action='submit' then
    v_event := case when p_action='submit' and v_was_submitted then 'resubmitted'
                    when p_action='submit' then 'submitted'
                    when v_was_submitted and v_changed then 'changed_after_submission'
                    else 'saved' end;
    insert into public.keeper_submission_events(submission_id,actor_user_id,action,revision,choices)
      values(v_submission.id,p_user_id,v_event,v_revision,v_choices);
  end if;
  return to_jsonb(v_submission);
end;
$$;

create or replace function public.set_official_keeper_lock(
  p_actor_user_id uuid,
  p_action text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window public.keeper_windows%rowtype;
  v_now timestamptz := now();
begin
  if not exists (
    select 1 from public.franchise_accounts
    where user_id=p_actor_user_id and role='commissioner' and must_change_password=false
  ) then raise exception 'Commissioner account required'; end if;
  if p_action not in ('lock','unlock') then raise exception 'Unknown keeper lock action'; end if;
  select * into v_window from public.keeper_windows where season=2026 for update;
  if not found then raise exception 'Official keeper window is not installed'; end if;

  if p_action='lock' then
    if (select count(*) from public.keeper_submissions where season=2026 and status='submitted') <> 10
      then raise exception 'All ten franchises must submit before locking'; end if;
    if exists (
      select 1 from public.keeper_submissions submission
      where submission.season=2026 and jsonb_array_length(submission.choices)<>3
    ) then raise exception 'Every franchise must have exactly three keepers'; end if;
    if exists (
      select 1
      from public.keeper_submissions submission
      cross join lateral jsonb_array_elements(submission.choices) choice
      left join public.keeper_eligibility eligibility
        on eligibility.season=submission.season and eligibility.franchise_id=submission.franchise_id
       and eligibility.player_key=regexp_replace(lower(choice->>'player'),'[^a-z0-9]+','','g')
       and eligibility.position=upper(choice->>'position') and eligibility.round=(choice->>'round')::integer
       and eligibility.eligible and eligibility.roster_verified and eligibility.cost_verified and eligibility.pick_verified
      where submission.season=2026 and eligibility.player_key is null
    ) then raise exception 'The board contains an uncertified player, cost, roster, or pick'; end if;
    if exists (
      select regexp_replace(lower(choice->>'player'),'[^a-z0-9]+','','g')
      from public.keeper_submissions submission cross join lateral jsonb_array_elements(submission.choices) choice
      where submission.season=2026
      group by 1 having count(*)>1
    ) then raise exception 'The board contains a duplicate player'; end if;

    update public.keeper_submissions set status='locked',updated_at=v_now where season=2026 and status='submitted';
    update public.keeper_windows set status='locked',locked_at=v_now,locked_by=p_actor_user_id,updated_at=v_now where season=2026;
    insert into public.keeper_submission_events(submission_id,actor_user_id,action,revision,choices)
      select id,p_actor_user_id,'locked',revision,choices from public.keeper_submissions where season=2026;
  else
    update public.keeper_submissions set status='submitted',updated_at=v_now where season=2026 and status='locked';
    update public.keeper_windows set status='open',locked_at=null,locked_by=null,updated_at=v_now where season=2026;
    insert into public.keeper_submission_events(submission_id,actor_user_id,action,revision,choices)
      select id,p_actor_user_id,'unlocked',revision,choices from public.keeper_submissions where season=2026;
  end if;
  select * into v_window from public.keeper_windows where season=2026;
  return to_jsonb(v_window);
end;
$$;

revoke all on function public.save_official_keeper_submission(uuid,text,jsonb,text) from public;
revoke all on function public.set_official_keeper_lock(uuid,text) from public;
grant execute on function public.save_official_keeper_submission(uuid,text,jsonb,text) to service_role;
grant execute on function public.set_official_keeper_lock(uuid,text) to service_role;
