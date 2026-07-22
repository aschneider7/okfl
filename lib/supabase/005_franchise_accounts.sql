-- OKFL OS 7.1.0 — invite-only franchise accounts.
-- Run after 001_okfl_schema.sql. Safe to run repeatedly.

create table if not exists public.franchise_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  franchise_id text not null unique references public.franchises(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  role text not null default 'manager' check (role in ('manager','commissioner')),
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (username = lower(username))
);

create index if not exists idx_franchise_accounts_role on public.franchise_accounts(role);
alter table public.franchise_accounts enable row level security;

-- Accounts are read and updated only by verified server routes using the service role.
-- No anon or authenticated table policies are intentionally created.
