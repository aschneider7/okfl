-- OKFL OS 8.7.0 — editable and publishable Commissioner Recaps.
-- Run after 005_franchise_accounts.sql. Safe to run repeatedly.

create table if not exists public.commissioner_recaps (
  id uuid primary key default gen_random_uuid(),
  league_id text not null references public.leagues(id) on delete cascade,
  season integer not null,
  week integer not null check (week between 1 and 18),
  status text not null default 'draft' check (status in ('draft','published')),
  headline text not null check (char_length(headline) between 5 and 180),
  dek text not null default '' check (char_length(dek) <= 400),
  quote text not null default '' check (char_length(quote) <= 500),
  sections jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_name text not null default '',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id,season,week)
);
create index if not exists idx_commissioner_recaps_publication on public.commissioner_recaps(league_id,season,status,week desc);
alter table public.commissioner_recaps enable row level security;
-- Reads and writes are mediated by server routes; the service role remains the only direct writer.
