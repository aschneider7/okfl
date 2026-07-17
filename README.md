# OKFL OS v0.6.6 — Supabase Foundation

This release replaces the Vercel Blob snapshot with a normalized Supabase PostgreSQL database.

## Included

- Server-only Supabase client
- SQL migration for leagues, franchises, identities, sync runs, users, rosters, transactions, trades, matchups, traded picks, drafts, and playoff brackets
- Idempotent upserts using Sleeper IDs
- Manual commissioner sync
- Daily Vercel cron sync
- Sync history and integrity reporting
- Public `/api/sleeper/live` endpoint backed by database rows
- Existing password-protected commissioner login preserved

## Supabase setup

1. Create a free Supabase project.
2. Open **SQL Editor**.
3. Run `supabase/001_okfl_schema.sql`.
4. In **Project Settings → API Keys**, create/copy a Secret key.
5. Add these Vercel environment variables:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
COMMISSIONER_PASSWORD=Goodeats
CRON_SECRET=use-a-random-string-at-least-16-characters
```

6. Redeploy.
7. Open `/commissioner`.
8. Press **Sync Sleeper Now**.

## Security

`SUPABASE_SECRET_KEY` is server-only and must never use a `NEXT_PUBLIC_` prefix. The SQL enables RLS and creates no public policies, so database access is limited to the server routes using the secret key.

## Deploy

Replace the repository files with this package, commit, and deploy through Vercel.
