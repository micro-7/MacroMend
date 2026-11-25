# Proposal

## Why

Logging and seeing what's left is the core loop of MacroMend (docs/SPEC.md, MVP features 3 and the manual-pick fallback). It must work with no AI at all, because manual pick is the last step of the provider chain and the base that text logging builds on later.

## What Changes

- Log tab: search the food table by name or alias, pick a food, choose quantity, unit and meal slot, see kcal and protein before saving, then save.
- Quantity converter: turns a quantity and unit (the food's own unit such as piece or scoop, grams, or household measures such as katori, bowl, cup, glass, tbsp, tsp) into grams, then kcal and protein from the food table.
- Today tab: a "What's left today" card with remaining kcal and protein, eaten vs target, updated after every log, and a warning once the kcal target is crossed; below it, today's entries grouped by meal slot.
- Edit or delete a logged entry.
- Days roll over at local midnight.

## Capabilities

### New Capabilities
- `food-logging`: picking a food, quantity, unit and slot, saving, editing and deleting log entries.
- `portion-conversion`: converting quantities and units into grams, kcal and protein.
- `daily-summary`: the what's-left card, over-target warnings and today's entries by slot.

### Modified Capabilities
None.

## Impact

- New pure modules `src/core/portions.ts`, `src/core/summary.ts`; storage `src/db/logs.ts`.
- Replaces the Today and Log placeholder screens.
- Uses `logs`, `foods`, `food_names` and `profile` from earlier changes; no schema change expected.
