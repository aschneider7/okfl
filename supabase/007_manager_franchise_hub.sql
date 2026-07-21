-- OKFL OS 7.3.0 — persistent manager profiles, inbox, and personal activity.
-- Run after 005_franchise_accounts.sql. Safe to run repeatedly.

create table if not exists public.manager_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  franchise_id text not null unique references public.franchises(id) on delete cascade,
  team_display_name text,
  avatar_url text,
  primary_color text not null default '#171915',
  accent_color text not null default '#c8ff38',
  bio text,
  motto text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  check (accent_color ~ '^#[0-9A-Fa-f]{6}$')
);

create table if not exists public.manager_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'notification' check (kind in ('notification','offer','poll')),
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.manager_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  franchise_id text not null references public.franchises(id) on delete cascade,
  event_type text not null,
  title text not null,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_manager_notifications_unread
  on public.manager_notifications(user_id, read_at, created_at desc);
create index if not exists idx_manager_activity_recent
  on public.manager_activity(user_id, created_at desc);

alter table public.manager_profiles enable row level security;
alter table public.manager_notifications enable row level security;
alter table public.manager_activity enable row level security;

-- These tables are accessed only through verified server routes.
insert into public.manager_profiles(user_id,franchise_id,team_display_name)
select user_id,franchise_id,franchises.name
from public.franchise_accounts
join public.franchises on franchises.id=franchise_accounts.franchise_id
on conflict (user_id) do nothing;

insert into public.manager_notifications(user_id,kind,title,body,href)
select account.user_id,'notification','Your franchise hub is live',
  'Roster, matchup, keeper, power-ranking, awards, and career intelligence now live in one private dashboard.',
  '/account'
from public.franchise_accounts account
where not exists (
  select 1 from public.manager_notifications notification
  where notification.user_id=account.user_id and notification.title='Your franchise hub is live'
);
