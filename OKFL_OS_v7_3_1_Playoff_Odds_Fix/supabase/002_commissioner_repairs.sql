-- OKFL OS v0.6.7 — Commissioner repair center
-- Run this after 001_okfl_schema.sql.

create table if not exists public.roster_identity_overrides (
  league_id text not null references public.leagues(id) on delete cascade,
  season integer not null,
  roster_id integer not null,
  franchise_id text not null references public.franchises(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (league_id, season, roster_id)
);

create table if not exists public.commissioner_audit_log (
  id uuid primary key default gen_random_uuid(),
  league_id text not null references public.leagues(id) on delete cascade,
  season integer,
  action text not null,
  entity_type text not null,
  entity_key text not null,
  before_data jsonb,
  after_data jsonb,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_roster_overrides_franchise
  on public.roster_identity_overrides(franchise_id, season);

create index if not exists idx_commissioner_audit_recent
  on public.commissioner_audit_log(league_id, created_at desc);

alter table public.roster_identity_overrides enable row level security;
alter table public.commissioner_audit_log enable row level security;

-- No public policies are created. These tables are accessed only by
-- authenticated OKFL server routes using SUPABASE_SECRET_KEY.
