# OKFL OS v0.6.5 — Commissioner Sync

## Added
- Password-protected Commissioner tab using an HttpOnly server session cookie
- Manual **Sync Sleeper Now** control
- Automatic daily Vercel Cron sync
- Persistent 2026 snapshot in Vercel Blob
- Current rosters, users, matchups, transactions, completed trades, traded picks, drafts, and playoff brackets
- Identity integrity report for unresolved Sleeper users/rosters
- Public homepage live-sync status card

## 2026 Sleeper league
`1381102523590389760`

## Required Vercel setup

### 1. Create a Blob store
In Vercel: **Storage → Create Database/Store → Blob** and connect it to this project. Vercel will add `BLOB_READ_WRITE_TOKEN` automatically.

### 2. Add environment variables
In **Project Settings → Environment Variables**, add:

- `COMMISSIONER_PASSWORD` = your chosen commissioner password
- `CRON_SECRET` = a long random value

Add both to Production, Preview, and Development if you want them available everywhere.

### 3. Deploy
The Hobby-plan-compatible cron runs once daily at 10:00 UTC. Use the Commissioner tab for immediate manual syncing.

## Security note
The password is not stored in browser JavaScript or committed to the repository. Authentication is validated on the server and stored in an HttpOnly cookie.
