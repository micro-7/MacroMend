# Proposal

## Why

"Fix my day" is what makes MacroMend different from a plain tracker: after an off-plan meal, one tap rebuilds the rest of the day from the user's own usual foods, protein first, in real portions (docs/SPEC.md, MVP feature 4). It is pure maths over the food table, staples and today's logs, so it can ship before any AI work.

## What Changes

- A "Fix my day" button on the Today screen.
- A rebalance engine (pure functions, no AI) that spreads remaining protein and kcal across today's open meal slots, choosing protein staples first and carb staples for the rest, only from foods the diet type allows.
- Suggestions use real portions: whole pieces, scoops and slices; gram foods in 25 g steps; never more than twice the user's usual quantity.
- Swap one suggested food for another staple, or shuffle the whole plan.
- Log a suggested meal (or one item) in one tap, using the existing logging path.
- Clear messages when nothing is left, every slot is logged, or staples are missing.

## Capabilities

### New Capabilities
- `day-rebalance`: filling open slots from staples to meet the rest of today's targets, with swap, shuffle and logging of suggestions.

### Modified Capabilities
None.

## Impact

- New pure module `src/core/rebalance.ts` with heavy unit tests.
- New Today-screen section/sheet for suggestions; uses `logFood()` from `add-manual-logging`, `allowedCategories()` and `foodRole` from `add-onboarding`.
- No schema change.
