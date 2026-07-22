-- OKFL OS 8.4.1 — grant Haimy Commissioner access.
-- Run after 005_franchise_accounts.sql. Safe to run repeatedly.

update public.franchise_accounts
set role = 'commissioner',
    updated_at = now()
where franchise_id = 'F08'
  and username = 'haimy';

do $$
begin
  if not exists (
    select 1
    from public.franchise_accounts
    where franchise_id = 'F08'
      and username = 'haimy'
      and role = 'commissioner'
  ) then
    raise exception 'Haimy account (F08 / haimy) was not found. Run account setup before this migration.';
  end if;
end
$$;
