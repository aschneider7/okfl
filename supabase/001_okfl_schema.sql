-- OKFL OS v0.6.6 — Supabase foundation
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.leagues (
  id text primary key,
  name text not null,
  platform text not null default 'sleeper',
  current_season integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.franchises (
  id text primary key,
  league_id text not null references public.leagues(id) on delete cascade,
  name text not null,
  current_manager text,
  original_manager text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.identity_aliases (
  id uuid primary key default gen_random_uuid(),
  league_id text not null references public.leagues(id) on delete cascade,
  franchise_id text not null references public.franchises(id) on delete cascade,
  season integer,
  platform text not null,
  external_user_id text,
  username text,
  display_name text,
  team_name text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, season, platform, external_user_id),
  unique (league_id, season, platform, username)
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  league_id text not null references public.leagues(id) on delete cascade,
  season integer not null,
  status text not null check (status in ('running','success','failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  counts jsonb not null default '{}'::jsonb,
  integrity jsonb not null default '{}'::jsonb,
  error text
);

create table if not exists public.sleeper_users (
  league_id text not null references public.leagues(id) on delete cascade,
  season integer not null,
  user_id text not null,
  franchise_id text references public.franchises(id) on delete set null,
  username text,
  display_name text,
  team_name text,
  avatar text,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (league_id, season, user_id)
);

create table if not exists public.sleeper_rosters (
  league_id text not null references public.leagues(id) on delete cascade,
  season integer not null,
  roster_id integer not null,
  owner_id text,
  franchise_id text references public.franchises(id) on delete set null,
  players jsonb not null default '[]'::jsonb,
  starters jsonb not null default '[]'::jsonb,
  reserve jsonb not null default '[]'::jsonb,
  taxi jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (league_id, season, roster_id)
);

create table if not exists public.sleeper_transactions (
  league_id text not null references public.leagues(id) on delete cascade,
  season integer not null,
  transaction_id text not null,
  week integer,
  type text,
  status text,
  created_at_ms bigint,
  roster_ids jsonb not null default '[]'::jsonb,
  adds jsonb not null default '[]'::jsonb,
  drops jsonb not null default '[]'::jsonb,
  draft_picks jsonb not null default '[]'::jsonb,
  waiver_budget jsonb not null default '[]'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (league_id, season, transaction_id)
);

create table if not exists public.sleeper_trades (
  league_id text not null references public.leagues(id) on delete cascade,
  season integer not null,
  transaction_id text not null,
  week integer,
  created_at_ms bigint,
  sides jsonb not null default '[]'::jsonb,
  draft_picks jsonb not null default '[]'::jsonb,
  waiver_budget jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (league_id, season, transaction_id)
);

create table if not exists public.sleeper_matchups (
  league_id text not null references public.leagues(id) on delete cascade,
  season integer not null,
  week integer not null,
  roster_id integer not null,
  matchup_id integer,
  franchise_id text references public.franchises(id) on delete set null,
  points numeric not null default 0,
  starters jsonb not null default '[]'::jsonb,
  starters_points jsonb not null default '[]'::jsonb,
  players jsonb not null default '[]'::jsonb,
  players_points jsonb not null default '{}'::jsonb,
  custom_points numeric,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (league_id, season, week, roster_id)
);

create table if not exists public.sleeper_traded_picks (
  league_id text not null references public.leagues(id) on delete cascade,
  season integer not null,
  pick_key text not null,
  round integer,
  roster_id integer,
  previous_owner_id integer,
  owner_id integer,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (league_id, season, pick_key)
);

create table if not exists public.sleeper_drafts (
  league_id text not null references public.leagues(id) on delete cascade,
  season integer not null,
  draft_id text not null,
  status text,
  type text,
  start_time bigint,
  settings jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (league_id, season, draft_id)
);

create table if not exists public.sleeper_brackets (
  league_id text not null references public.leagues(id) on delete cascade,
  season integer not null,
  bracket_type text not null check (bracket_type in ('winners','losers')),
  row_id text not null,
  row_data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (league_id, season, bracket_type, row_id)
);

create index if not exists idx_matchups_franchise on public.sleeper_matchups(franchise_id, season, week);
create index if not exists idx_transactions_week on public.sleeper_transactions(league_id, season, week);
create index if not exists idx_trades_week on public.sleeper_trades(league_id, season, week);
create index if not exists idx_sync_runs_latest on public.sync_runs(league_id, season, started_at desc);

alter table public.leagues enable row level security;
alter table public.franchises enable row level security;
alter table public.identity_aliases enable row level security;
alter table public.sync_runs enable row level security;
alter table public.sleeper_users enable row level security;
alter table public.sleeper_rosters enable row level security;
alter table public.sleeper_transactions enable row level security;
alter table public.sleeper_trades enable row level security;
alter table public.sleeper_matchups enable row level security;
alter table public.sleeper_traded_picks enable row level security;
alter table public.sleeper_drafts enable row level security;
alter table public.sleeper_brackets enable row level security;

-- No public database policies are created.
-- OKFL OS reads and writes through server routes using SUPABASE_SECRET_KEY only.
