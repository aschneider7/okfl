# OKFL OS 8.0

The Obama Keeper Fantasy League command center for historical research, franchise intelligence, trade analysis, keeper decisions, live records, and mock drafts.

## Core experiences

- League-wide search across players, franchises, seasons, trades, drafts, and weekly NFL production
- Full editorial interface rebuild with an asymmetric information grid, grouped navigation, sharper typography, cleaner controls, and a new bone, ink, cobalt, teal, and acid-lime palette across every route
- Readability refinement with roomier system typography, larger interface labels, a teal signal color, and collapsible navigation groups
- Explicit contrast protection for Franchise and Commissioner feature panels so text remains readable over their intended dark backgrounds
- Invite-only franchise accounts for all ten teams, mandatory first-login password changes, persistent manager sessions, and Aaron-only Commissioner authorization
- Franchise profiles, comparison tools, standings, records, and historical weekly snapshots
- Franchise Profiles 3.1 with ten distinct identities, high-contrast profile cards, competitive posture, market behavior, draft philosophy, matchup relationships, and league-wide identity leaders
- Live 2026 Power Rankings that recalculate after every Sleeper sync, switch from preseason to post-draft and weekly models, and preserve week-to-week movement
- Live League Dashboard with synced standings, matchups, weekly awards, power movement, and transaction activity
- Playoff Odds Simulator with remaining-schedule simulations, six-team seeding, title odds, and temporary what-if strength adjustments
- Quality-of-life polish with a new football-and-data logo, unified card and control styling, smoother route transitions, navigation progress, refined loading states, and calmer mobile interactions
- Automatic Weekly League Recap with selectable past editions, five matchup stories, weekly superlatives, top-player reporting, and a shareable headline
- Live League Awards Race for MVP, Offensive Player, Quarterback, Waiver Find, Manager, and GM honors, with automatic final-winner selection after the championship schedule
- Smooth UI system with route transitions, skeleton loading, refined interaction states, stable scrolling, responsive polish, and reduced-motion support
- Trade Machine 2.0 with current market value, keeper surplus, draft capital, team windows, roster needs, and balancing suggestions
- Mock Draft Room V4.3 with a full-width, high-legibility board; daily 10-team PPR market data; kickers and defenses; protected offline depth; autosave; and final grades
- Official Keeper Operations with authenticated three-player submissions, a commissioner-certified eligibility ledger, server-enforced roster/cost/pick verification, atomic locking, revision tracking, and a final locked board
- Stability architecture that lazy-loads the historical archive only where needed and prevents release folders, local secrets, and ZIP packages from being committed
- Repository hardening with a public npm lockfile, automatic GitHub validation, and removal of retired search and social-preview assets
- Authenticated Live Draft Room with automatic franchise seat claiming, synchronized picks, reconnect-safe storage, online presence, commissioner-only controls, automatic AI franchises, and a server-backed custom pick clock
- My Franchise command center with live roster and matchup data, personalized playoff odds, keeper recommendations, trade needs, power and awards movement, editable branding, career records, rivalries, achievements, private inbox, and personal activity history
- Commissioner repair and live Sleeper synchronization tools
- Playoff Clinching Paths with conservative mathematical status, projected cut lines, and upcoming swing games
- Luck Index with schedule-neutral expected wins, all-play records, schedule difficulty, and close-game performance
- Player Ownership Genealogy with searchable franchise timelines for every tracked player
- Waiver Wire Hall of Fame with all-time manager leaderboards and historically scored acquisitions

## Visual system

Version 4.1 introduced the Clubhouse visual system across desktop and mobile. Version 4.2 added a live PPR draft market. Version 4.3 rebuilt the Mock Draft Room. Version 5 added the multiplayer Live Draft Room and deeper franchise profiles. Version 6 introduced the global smoothness system and Power Rankings; 6.1 connected those rankings to Sleeper, 6.2 added the live season dashboard and playoff simulator, 6.3 unified the experience with the OKFL OS identity, and 6.4 launched the weekly newsroom and season-long awards ballot. Version 7 reframes every feature with a new editorial design system while preserving the existing data, draft, simulation, and synchronization architecture. Version 7.2 adds official account-bound keeper operations and authenticated live-draft seats. Version 7.3 gives every manager a persistent, personalized franchise command center. Version 7.3.1 recalibrates playoff odds, completes partial Sleeper schedules, and prevents live scoring from being mistaken for a finished week. Version 7.4 hardens keeper integrity, makes board updates atomic, removes duplicate release trees, and defers the multi-megabyte archive until a route or search actually needs it. Version 7.4.1 repairs commissioner keeper diagnostics and adds a clear recovery state when required Supabase migrations are missing. Version 7.5 hardens the repository with a public npm lockfile, automatic GitHub validation, and removal of confirmed dead assets. Version 8 adds a League Lab for clinching scenarios, schedule luck, player ownership history, and waiver-wire legacy.

## My Franchise setup

1. Run `supabase/007_manager_franchise_hub.sql` after migrations 005 and 006. It is safe to run repeatedly.
2. Redeploy and sign in. The account chip and the new **My Franchise** navigation link both open `/account`.
3. Each manager can edit their avatar URL, team display name, colors, bio, and motto. Live roster, matchup, odds, rankings, awards, keepers, rivalries, career records, and achievements update from existing OKFL and Sleeper data.
4. The migration creates a private welcome notification for every account. Future trade offers and league polls can be written to `manager_notifications` with `kind` set to `offer` or `poll` and will appear automatically.

## Franchise account setup

1. Run `supabase/005_franchise_accounts.sql` in the existing Supabase SQL Editor after the base schema.
2. Keep `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured locally and in Vercel.
3. Run `npm run setup:accounts`. To use a prepared credentials JSON file, append its path after `--`.
4. Save the generated `outputs/OKFL_Initial_Account_Credentials.txt` and distribute each entry privately.
5. Redeploy. Each manager signs in at `/login` and must replace the temporary password immediately.

The ten invite-only usernames are `aaron`, `elie`, `sammy`, `isaac`, `tzvi`, `usher`, `josh-teddy`, `haimy`, `maurice`, and `sean`. Aaron is the only Commissioner role. The former shared `COMMISSIONER_PASSWORD` is no longer used.

Never place a real Supabase secret in `.env.example` or any tracked file. Local secrets belong only in `.env.local`, while hosted secrets belong in Vercel environment variables.

## Live Power Rankings setup

1. Run `supabase/004_live_power_rankings.sql` in Supabase after the base schema. It is safe to run repeatedly.
2. Keep `CRON_SECRET` configured in Vercel so the daily `/api/sleeper/sync` cron is authorized.
3. Redeploy, then run one Sleeper sync from Commissioner to create the first snapshot immediately.

The model uses the historical preseason baseline until Sleeper draft picks exist, switches to drafted-roster and draft-value scoring after the draft, then uses scoring, win rate, three-week form, roster strength, and a smaller preseason prior once games are completed.

## Live Draft setup

1. Run `supabase/003_live_draft_rooms.sql` in the existing Supabase project after migrations 001 and 002. It is safe to run again when upgrading from 5.0.
2. Run `supabase/006_official_keepers_and_auth_draft.sql` after migrations 003 and 005. This adds official keeper submissions and account-bound seats while leaving existing rooms compatible.
3. Run `supabase/008_keeper_integrity.sql` after migration 006. It installs the certified 2026 eligibility ledger and atomic submission/locking functions.
4. Keep `SUPABASE_URL` and `SUPABASE_SECRET_KEY` configured for server routes.
5. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for instant presence and broadcast refreshes. The room also polls as a fallback when Realtime is unavailable.
6. Redeploy. Aaron sets the keeper deadline in Commissioner OS, all ten managers submit at `/keepers`, and Aaron locks the final board.
7. Open `/live-draft`. Aaron creates the official room and shares its invite link; signed-in managers automatically claim their own franchise without team PINs.

## Validation

Run `npm run validate` for archive, mock draft, live draft schema, ranking, and trade-model checks. Run `npm run build` for the production build and TypeScript validation.
