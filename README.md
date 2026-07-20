# OKFL OS 5.1

The Obama Keeper Fantasy League command center for historical research, franchise intelligence, trade analysis, keeper decisions, live records, and mock drafts.

## Core experiences

- League-wide search across players, franchises, seasons, trades, drafts, and weekly NFL production
- Franchise profiles, comparison tools, standings, records, and historical weekly snapshots
- Trade Machine 2.0 with current market value, keeper surplus, draft capital, team windows, roster needs, and balancing suggestions
- Mock Draft Room V4.3 with a full-width, high-legibility board; daily 10-team PPR market data; kickers and defenses; protected offline depth; autosave; and final grades
- Live Draft Room with a six-character invite code, ten PIN-protected franchise seats, synchronized picks, reconnect-safe storage, online presence, commissioner controls, automatic AI franchises, and a server-backed custom pick clock
- Commissioner repair and live Sleeper synchronization tools

## Visual system

Version 4.1 introduced the Clubhouse visual system across desktop and mobile. Version 4.2 added a live, attributed PPR draft market. Version 4.3 rebuilt the Mock Draft Room as a focused night-mode workspace. Version 5.0 added the separate multiplayer Live Draft Room. Version 5.1 adds automatic AI teams and 10-second, 30-second, 60-second, or custom pick clocks with AI timeout selections.

## Live Draft setup

1. Run `supabase/003_live_draft_rooms.sql` in the existing Supabase project after migrations 001 and 002. It is safe to run again when upgrading from 5.0.
2. Keep `SUPABASE_URL` and `SUPABASE_SECRET_KEY` configured for server routes.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for instant presence and broadcast refreshes. The room also polls as a fallback when Realtime is unavailable.
4. Redeploy, then open `/live-draft`. The commissioner creates a room and shares its invite link plus each franchise's private four-digit PIN.

## Validation

Run `npm run validate` for archive, mock draft, live draft schema, ranking, and trade-model checks. Run `npm run build` for the production build and TypeScript validation.
