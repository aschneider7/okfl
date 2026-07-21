-- OKFL OS 8.1.0 — commissioner announcements, league ballots, and consent-gated SMS.
-- Run after 005_franchise_accounts.sql and 007_manager_franchise_hub.sql. Safe to re-run.

create table if not exists public.league_contacts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  franchise_id text not null unique references public.franchises(id) on delete cascade,
  phone_e164 text,
  sms_opted_in boolean not null default false,
  consent_confirmed_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  check (not sms_opted_in or (phone_e164 is not null and consent_confirmed_at is not null))
);

create table if not exists public.league_communications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('announcement','poll')),
  title text not null check (char_length(title) between 3 and 120),
  body text not null default '' check (char_length(body) <= 2000),
  choices jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open','closed')),
  closes_at timestamptz,
  sms_requested boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check (kind = 'announcement' or jsonb_array_length(choices) between 2 and 8)
);

create table if not exists public.league_communication_recipients (
  communication_id uuid not null references public.league_communications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid references public.manager_notifications(id) on delete set null,
  sms_status text not null default 'not_requested' check (sms_status in ('not_requested','not_configured','not_consented','queued','failed')),
  sms_sid text,
  sms_error text,
  created_at timestamptz not null default now(),
  primary key (communication_id,user_id)
);

create table if not exists public.league_votes (
  communication_id uuid not null references public.league_communications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (communication_id,user_id)
);

create index if not exists idx_league_communications_recent on public.league_communications(created_at desc);
create index if not exists idx_league_communication_recipients_user on public.league_communication_recipients(user_id,created_at desc);
create index if not exists idx_league_votes_communication on public.league_votes(communication_id,option_id);

alter table public.league_contacts enable row level security;
alter table public.league_communications enable row level security;
alter table public.league_communication_recipients enable row level security;
alter table public.league_votes enable row level security;

insert into public.league_contacts(user_id,franchise_id)
select user_id,franchise_id from public.franchise_accounts
on conflict (user_id) do nothing;
