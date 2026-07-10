# OKFL OS v0.6.2 — Hybrid NFL Search

Adds internet-backed weekly NFL fantasy scoring to the existing OKFL search engine.

## Example queries

- `CMC 2024 Week 11 PPR fantasy points`
- `Christian McCaffrey 2024 wk 11 ppr points`
- `How many PPR fantasy points did CMC score in 2024 Week 11?`
- `Saquon Barkley 2025 Week 3 half PPR points`

## How it works

1. The browser recognizes a player + season + week fantasy query.
2. `/api/nfl/player-week` fetches the requested season's nflverse weekly player-stat CSV.
3. The server finds the best matching player and calculates fantasy points.
4. Historical results are cached for 30 days; current-season results refresh every 15 minutes.

## Default scoring

- 1 point per reception for PPR
- 0.5 points per reception for half-PPR
- 0 points per reception for standard
- 0.1 per rushing/receiving yard
- 6 per rushing/receiving TD
- 0.04 per passing yard
- 4 per passing TD
- -2 per interception
- -2 per lost fumble

The weekly data source is nflverse. No API key or environment variable is required.
