-- OKFL OS 8.2.0 — authenticated PWA devices and free Firebase push delivery.
-- Run after 005_franchise_accounts.sql and 009_league_communications.sql. Safe to re-run.

create table if not exists public.manager_push_devices (
  installation_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  franchise_id text not null references public.franchises(id) on delete cascade,
  device_label text not null default 'This device' check (char_length(device_label) between 1 and 80),
  platform text not null default 'web' check (char_length(platform) between 1 and 30),
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (installation_id ~ '^[A-Za-z0-9_-]{10,200}$')
);

create index if not exists idx_manager_push_devices_user on public.manager_push_devices(user_id,enabled,last_seen_at desc);
create index if not exists idx_manager_push_devices_franchise on public.manager_push_devices(franchise_id,enabled);
alter table public.manager_push_devices enable row level security;

alter table public.league_communication_recipients add column if not exists push_status text not null default 'not_requested';
alter table public.league_communication_recipients add column if not exists push_success_count integer not null default 0;
alter table public.league_communication_recipients add column if not exists push_failure_count integer not null default 0;
alter table public.league_communication_recipients add column if not exists push_error text;

do $$ begin
  alter table public.league_communication_recipients add constraint league_communication_recipients_push_status_check
    check (push_status in ('not_requested','not_configured','not_enabled','queued','partial','failed'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.league_communication_recipients add constraint league_communication_recipients_push_counts_check
    check (push_success_count >= 0 and push_failure_count >= 0);
exception when duplicate_object then null;
end $$;
