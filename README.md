# OKFL OS v0.6.7 — Commissioner Repair Center

This update makes unresolved Sleeper identity issues editable directly inside the password-protected Commissioner tab.

## New capabilities

- Assign an unresolved Sleeper user to F01–F10
- Assign an orphaned roster directly to F01–F10
- Add an optional commissioner note to each correction
- Save verified identity aliases permanently in Supabase
- Reuse saved corrections during every later Sleeper sync
- Update existing user, roster, and matchup rows immediately
- View saved mappings
- View a permanent commissioner audit log
- See a healthy status when all identities are resolved

## Required migration

After `001_okfl_schema.sql`, run:

```text
supabase/002_commissioner_repairs.sql
```

Open the file and paste its SQL contents into Supabase SQL Editor. Do not paste only the filename.

## Deploy

1. Run the second SQL migration.
2. Replace the GitHub repository files with this package.
3. Commit and redeploy in Vercel.
4. Open `/commissioner`.
5. Resolve each issue using the new dropdowns.
6. Run **Sync Sleeper Now** again.
