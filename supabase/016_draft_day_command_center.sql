-- OKFL OS 10.0.0 — private manager rankings and tightened draft RPC access.
-- Run after 008_keeper_integrity.sql. Safe to run repeatedly.

create table if not exists public.manager_draft_rankings (
  user_id uuid not null references auth.users(id) on delete cascade,
  franchise_id text not null references public.franchises(id) on delete cascade,
  season integer not null default 2026,
  rankings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, season),
  check (jsonb_typeof(rankings) = 'array')
);

create index if not exists idx_manager_draft_rankings_franchise
  on public.manager_draft_rankings(franchise_id, season);

alter table public.manager_draft_rankings enable row level security;
revoke all on table public.manager_draft_rankings from public, anon, authenticated;
grant all on table public.manager_draft_rankings to service_role;

-- These functions are called only from verified server routes with the service role.
revoke all on function public.make_live_draft_pick(text,text,jsonb,integer) from public, anon, authenticated;
revoke all on function public.make_live_draft_pick(text,text,jsonb) from public, anon, authenticated;
revoke all on function public.save_official_keeper_submission(uuid,text,jsonb,text) from public, anon, authenticated;
revoke all on function public.set_official_keeper_lock(uuid,text) from public, anon, authenticated;
grant execute on function public.make_live_draft_pick(text,text,jsonb,integer) to service_role;
grant execute on function public.make_live_draft_pick(text,text,jsonb) to service_role;
grant execute on function public.save_official_keeper_submission(uuid,text,jsonb,text) to service_role;
grant execute on function public.set_official_keeper_lock(uuid,text) to service_role;
