-- OKFL OS 7.2.0 — official keeper submissions and authenticated live-draft seats.
-- Run after 005_franchise_accounts.sql. Safe to run repeatedly.

create table if not exists public.keeper_windows (
  season integer primary key,
  deadline timestamptz,
  status text not null default 'open' check (status in ('open','locked')),
  locked_at timestamptz,
  locked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.keeper_submissions (
  id uuid primary key default gen_random_uuid(),
  season integer not null references public.keeper_windows(season) on delete cascade,
  franchise_id text not null references public.franchises(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  choices jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','submitted','locked')),
  revision integer not null default 0,
  changed_after_submission boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season, franchise_id),
  check (jsonb_typeof(choices) = 'array')
);

create table if not exists public.keeper_submission_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.keeper_submissions(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('saved','submitted','resubmitted','changed_after_submission','locked','unlocked')),
  revision integer not null,
  choices jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_keeper_submissions_season_status
  on public.keeper_submissions(season, status);
create index if not exists idx_keeper_events_submission_recent
  on public.keeper_submission_events(submission_id, created_at desc);

alter table public.keeper_windows enable row level security;
alter table public.keeper_submissions enable row level security;
alter table public.keeper_submission_events enable row level security;

-- Keeper data is intentionally accessed only through authenticated server routes.
insert into public.keeper_windows(season, status)
values (2026, 'open')
on conflict (season) do nothing;

-- PINs are retired for new rooms. Existing rooms remain compatible.
alter table public.live_draft_seats alter column pin_hash drop not null;
alter table public.live_draft_seats add column if not exists claimed_user_id uuid references auth.users(id) on delete set null;
create index if not exists idx_live_draft_seats_claimed_user
  on public.live_draft_seats(room_id, claimed_user_id);
