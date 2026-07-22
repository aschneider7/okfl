-- OKFL OS 8.4.0 — website-managed Commissioner settings and rulebook.
-- Run after 002_commissioner_repairs.sql and 005_franchise_accounts.sql. Safe to re-run.

create table if not exists public.league_settings (
  league_id text primary key references public.leagues(id) on delete cascade,
  rulebook_version text not null default '2026.1' check (char_length(rulebook_version) between 1 and 30),
  rulebook_managed boolean not null default false,
  notice_active boolean not null default false,
  notice_title text not null default '' check (char_length(notice_title) <= 80),
  notice_body text not null default '' check (char_length(notice_body) <= 300),
  notice_href text not null default '' check (char_length(notice_href) <= 300),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (notice_href = '' or notice_href ~ '^/')
);

create table if not exists public.league_rules (
  id text primary key check (id ~ '^[A-Z]{2,5}-[0-9]{3}$'),
  league_id text not null references public.leagues(id) on delete cascade,
  category text not null check (char_length(category) between 2 and 50),
  rule text not null check (char_length(rule) between 5 and 1000),
  status text not null default 'published' check (status in ('draft','published')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id,id)
);

alter table public.league_settings add column if not exists rulebook_managed boolean not null default false;

create index if not exists idx_league_rules_public
  on public.league_rules(league_id,status,sort_order,id);

alter table public.league_settings enable row level security;
alter table public.league_rules enable row level security;

insert into public.leagues(id,name,platform,current_season)
values ('okfl','Obama Keeper Fantasy League','sleeper',2026)
on conflict (id) do nothing;

insert into public.league_settings(league_id)
values ('okfl')
on conflict (league_id) do nothing;

-- No public policies are created. Read and write access goes through verified server routes.
