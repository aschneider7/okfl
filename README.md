# OKFL OS v1.0.2 — Future-Value Trade Analyzer

## Model correction
The trade analyzer no longer uses:
- OKFL history
- past ownership
- past championships
- historical league production

## Current inputs
- Weekly updated DynastyProcess 2QB market value
- Current 2QB consensus rank
- Age already reflected in market consensus
- Position scarcity within 2QB values
- Keeper eligibility
- Keeper round versus expected market round
- Remaining keeper years

The analyzer fetches current market values at analysis time and caches them for six hours.
