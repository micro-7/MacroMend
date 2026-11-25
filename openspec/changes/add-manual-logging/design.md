# Design

## Context

Builds on `setup-app-shell` (tables, food search, tabs) and `add-onboarding` (profile with targets and slots, `searchFoods`). Requirements are in `specs/`.

## Goals / Non-Goals

**Goals:**
- One `logFood()` path that later changes (rebalance, text parsing) reuse.
- Conversion and summary maths as pure, tested functions.

**Non-Goals:**
- Logging to past or future days, history views, weekly trends.
- Per-food custom units beyond the food's single default unit.

## Decisions

**Portion maths in `src/core/portions.ts`.** `toGrams(food, qty, unit)` and `nutrition(food, grams)`. Household measures are a constant table (`katori 150, bowl 250, cup 240, glass 250, tbsp 15, tsp 5`, `ml` treated as grams). Stored values are unrounded; rounding happens only for display (kcal whole, protein one decimal). Alternative: per-food measure tables; rejected for v1 as the data does not exist yet.

**Single write path `src/db/logs.ts`.** `logFood({date, slot, foodId, qty, unit, rawText?, estimated?})` computes grams/kcal/protein from the current food row and inserts a snapshot. `updateLog`, `deleteLog`, `listLogs(date)`. Later changes call `logFood` rather than writing rows themselves.

**Summary in `src/core/summary.ts`.** `summarize(logs, profile)` returns eaten, remaining (floored at 0), `kcalOverBy`, `proteinMet`, and per-slot groups including "Other". The Today screen subscribes to a small in-memory store (`useDayStore`) that reloads after any write, so the card updates without a manual refresh.

**Local date.** `todayKey()` builds `YYYY-MM-DD` from the phone's local time; the Today screen re-checks the date when the app returns to the foreground (`AppState`), which handles midnight rollover.

**Default slot.** `defaultSlotFor(time, slots)` maps the four default slot ids by hour and otherwise returns the first slot.

## Risks / Trade-offs

- [Household measures vary (a katori can be 100–200 g)] → fixed values are shown next to the unit ("katori ≈150 g") so the user can switch to grams.
- [Treating ml as grams is wrong for oils and similar] → acceptable for v1 drinks such as milk and lassi; noted in the UI hint for tbsp/tsp only where needed later.
- [Timezone travel can move entries between days] → dates are stored as local date strings at save time; v1 accepts this.
