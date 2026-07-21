-- OKFL OS v5.1 — persistent multiplayer draft rooms and automatic pick clock
-- Safe to re-run after 001_okfl_schema.sql and 002_commissioner_repairs.sql.

create table if not exists public.live_draft_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) = 6),
  name text not null default 'OKFL Live Draft',
  status text not null default 'lobby' check (status in ('lobby','live','paused','complete')),
  current_overall integer not null default 1 check (current_overall between 1 and 171),
  host_name text not null,
  host_token_hash text not null,
  settings jsonb not null default '{"teams":10,"rounds":17,"scoring":"PPR","clockSeconds":30}'::jsonb,
  pick_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Adds v5.1 clock support when v5.0 of this migration was already installed.
alter table public.live_draft_rooms add column if not exists pick_deadline timestamptz;
update public.live_draft_rooms
set settings = settings || '{"clockSeconds":30}'::jsonb
where not (settings ? 'clockSeconds');

create table if not exists public.live_draft_seats (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_draft_rooms(id) on delete cascade,
  franchise_id text not null,
  slot integer not null check (slot between 1 and 10),
  manager_name text not null,
  pin_hash text not null,
  seat_token_hash text,
  claimed_name text,
  claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (room_id, franchise_id),
  unique (room_id, slot)
);

create table if not exists public.live_draft_picks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_draft_rooms(id) on delete cascade,
  overall integer not null check (overall between 1 and 170),
  round integer not null check (round between 1 and 17),
  slot integer not null check (slot between 1 and 10),
  franchise_id text not null,
  player_key text not null,
  player jsonb not null,
  keeper boolean not null default false,
  keeper_cost integer,
  selected_by text,
  created_at timestamptz not null default now(),
  unique (room_id, overall),
  unique (room_id, player_key)
);

create index if not exists idx_live_draft_rooms_code on public.live_draft_rooms(code);
create index if not exists idx_live_draft_picks_room on public.live_draft_picks(room_id, overall);

alter table public.live_draft_rooms enable row level security;
alter table public.live_draft_seats enable row level security;
alter table public.live_draft_picks enable row level security;

-- Every pick locks its room and verifies the expected selection number. This
-- prevents two browsers from drafting twice when an AI or timer fires at once.
create or replace function public.make_live_draft_pick(
  p_room_code text,
  p_actor_token_hash text,
  p_player jsonb,
  p_expected_overall integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.live_draft_rooms%rowtype;
  v_seat public.live_draft_seats%rowtype;
  v_overall integer;
  v_round integer;
  v_pick_in_round integer;
  v_slot integer;
  v_next integer;
  v_key text;
  v_is_host boolean;
  v_clock_seconds integer;
begin
  select * into v_room
  from public.live_draft_rooms
  where code = upper(trim(p_room_code))
  for update;

  if not found then raise exception 'Draft room not found'; end if;
  if v_room.status <> 'live' then raise exception 'Draft room is not live'; end if;
  if v_room.current_overall > 170 then raise exception 'Draft is complete'; end if;
  if p_expected_overall is not null and v_room.current_overall <> p_expected_overall then
    raise exception 'The clock has already advanced';
  end if;

  v_overall := v_room.current_overall;
  v_round := floor((v_overall - 1) / 10) + 1;
  v_pick_in_round := mod(v_overall - 1, 10) + 1;
  v_slot := case when mod(v_round, 2) = 1 then v_pick_in_round else 11 - v_pick_in_round end;

  select * into v_seat from public.live_draft_seats where room_id = v_room.id and slot = v_slot;
  if not found then raise exception 'Current draft seat not found'; end if;

  v_is_host := v_room.host_token_hash = p_actor_token_hash;
  if not v_is_host and coalesce(v_seat.seat_token_hash, '') <> p_actor_token_hash then
    raise exception 'This franchise is not on the clock';
  end if;
  if not v_is_host and v_room.pick_deadline is not null and v_room.pick_deadline <= now() then
    raise exception 'The pick clock has expired';
  end if;

  v_key := trim(coalesce(p_player->>'key', ''));
  if v_key = '' then raise exception 'Player key is required'; end if;
  if exists (select 1 from public.live_draft_picks where room_id = v_room.id and player_key = v_key) then
    raise exception 'Player has already been drafted';
  end if;

  insert into public.live_draft_picks (
    room_id, overall, round, slot, franchise_id, player_key, player, keeper, selected_by
  ) values (
    v_room.id, v_overall, v_round, v_slot, v_seat.franchise_id, v_key, p_player - 'key', false,
    case
      when v_is_host and v_seat.claimed_name is null then 'AI'
      when v_is_host then 'clock AI'
      else coalesce(v_seat.claimed_name, v_seat.manager_name)
    end
  );

  v_next := v_overall + 1;
  while v_next <= 170 and exists (
    select 1 from public.live_draft_picks where room_id = v_room.id and overall = v_next
  ) loop
    v_next := v_next + 1;
  end loop;

  v_clock_seconds := greatest(1, least(3600, coalesce((v_room.settings->>'clockSeconds')::integer, 30)));
  update public.live_draft_rooms
  set current_overall = least(v_next, 171),
      status = case when v_next > 170 then 'complete' else status end,
      pick_deadline = case when v_next > 170 then null else now() + make_interval(secs => v_clock_seconds) end,
      updated_at = now()
  where id = v_room.id;

  return jsonb_build_object('overall', v_overall, 'next_overall', v_next, 'slot', v_slot);
end;
$$;

-- Compatibility wrapper for any v5.0 client still finishing a request during deployment.
create or replace function public.make_live_draft_pick(
  p_room_code text,
  p_actor_token_hash text,
  p_player jsonb
) returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.make_live_draft_pick(p_room_code, p_actor_token_hash, p_player, null);
$$;

revoke all on function public.make_live_draft_pick(text,text,jsonb,integer) from public;
revoke all on function public.make_live_draft_pick(text,text,jsonb) from public;
grant execute on function public.make_live_draft_pick(text,text,jsonb,integer) to service_role;
grant execute on function public.make_live_draft_pick(text,text,jsonb) to service_role;
