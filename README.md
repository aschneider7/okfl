# OKFL OS v0.7.1 — Search Engine 2.0 & Franchise Profiles

## Search Engine 2.0
- Global command palette available from every page
- Open with `/`, `Ctrl+K`, or `Cmd+K`
- Predictive fuzzy search across players, franchises, managers, seasons and major sections
- Keyboard navigation
- Direct navigation to full franchise scouting reports
- Existing natural-language and live NFL search remain on the homepage

## Franchise Profiles 2.0
- Dedicated route for every franchise: `/franchises/F01` through `/franchises/F10`
- Original dynamic tags ranked against league behavior
- Unique signature identity for each franchise
- Eight-dimension Franchise DNA
- Career record, win rate, PF, PA, titles, runner-ups, average finish and Legacy Score
- Best weekly score and biggest win
- Final-finish timeline
- Regular-season history
- Draft grades
- Recent trades and keeper decisions

## Tag inputs
Tags use actual league-wide rankings for:
- trade volume
- keeper usage
- late-round hits
- win percentage
- scoring
- final-finish quality
- consistency
- weekly volatility
- positional draft preferences
- championships and runner-up history

## Deploy
Replace the repository files with this package, commit, and redeploy through Vercel.


## v0.7.1 deployment fix
- Added `draft_grades` to the shared `OKFLData` type.
- Added the full set of Franchise DNA metric fields to the shared `Metric` type.
- Fixes the Vercel TypeScript failure in `app/franchises/[id]/page.tsx`.
