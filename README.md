# OKFL OS v1.0.1 — Search Restore & Keeper Eligibility

## Search
- Restored the exact Search Engine 3.0 homepage component from v0.9.2
- Restored the same predictive layout, live weekly NFL lookup, zero-click answers, and styling
- Kept Home 2.0 around the restored search section
- Restored the prior global command palette behavior

## Trade Analyzer
- Added a two-option keeper eligibility control for every player:
  - Can be kept
  - Can't be kept
- Players marked as not keeper-eligible receive zero keeper value
- Keeper cost and keeper year are disabled when not eligible
- The verdict explicitly explains when no keeper value was included

## Deploy
Replace the repository files, commit, and redeploy through Vercel.
