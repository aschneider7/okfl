-- OKFL OS 8.5.0 — Commissioner-managed league calendar.
-- Run after 005_franchise_accounts.sql. Safe to run repeatedly.

create table if not exists public.league_calendar_events (
  id uuid primary key default gen_random_uuid(),
  league_id text not null references public.leagues(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  category text not null default 'league' check (category in ('league','keeper','draft','matchup','waiver','trade','vote','social')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  href text not null default '' check (href = '' or href ~ '^/'),
  status text not null default 'published' check (status in ('published','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create index if not exists idx_league_calendar_events_timeline
  on public.league_calendar_events(league_id,status,starts_at);

alter table public.league_calendar_events enable row level security;

-- Calendar reads and writes go through verified server routes.
