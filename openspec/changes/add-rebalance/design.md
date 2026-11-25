# Design

## Context

Builds on `add-onboarding` (staples with usual quantity, `allowedCategories`, `foodRole`) and `add-manual-logging` (`logFood`, `summarize`, portion maths, Today screen). Requirements are in `specs/`.

## Goals / Non-Goals

**Goals:**
- Deterministic, fully unit-tested engine: same inputs + seed → same plan.
- Fast enough to rerun on every swap (well under 50 ms for ≤8 slots, ≤30 staples).

**Non-Goals:**
- Optimal (LP/ILP) meal planning, fat/carb macro targets, recipes, foods outside staples.

## Decisions

**Engine shape.** `rebalance({remainingKcal, remainingProtein, openSlots, staples, dietType, seed}) → Plan`. `Plan = {slots: [{slotId, items: [{foodId, qty, unit, grams, kcal, protein}], kcal, protein}], totalKcal, totalProtein, proteinShortBy, reason?}`. All inputs are plain objects; the screen gathers them from the database.

**Greedy, protein first.**
1. Filter staples by diet type; split into protein foods and carb foods with `foodRole`.
2. Per-slot budgets: remaining kcal and protein ÷ number of open slots.
3. Assign one protein staple per slot, rotating through protein staples in a seeded order so slots differ; pick the smallest portion step that reaches the slot's protein share, capped by the slot kcal budget and 2× usual quantity.
4. If protein is still short and kcal room remains, add a second protein staple to the slot with the most room.
5. Fill each slot's leftover kcal with one carb staple (rotating), largest portion step that fits.
6. Final pass: if total kcal exceeds remaining kcal, step down the last-added carb portions until it fits.
Alternative: integer programming for an optimal plan; rejected as heavy, hard to explain and unnecessary for 2–4 items per slot.

**Portion steps.** `piece/scoop/slice` (and any non-gram default unit): step 1 unit, minimum 1. `g`/`ml` foods: step 25 g, minimum 50 g. Cap: 2 × usual quantity (in the staple's unit), and never below one step.

**Seeded randomness.** A small seeded PRNG (mulberry32) drives rotation order; Shuffle bumps the seed. Swap replaces one item with the next allowed staple of the same role not already in that slot and recomputes only that slot.

**State.** The plan lives in screen state, recalculated whenever today's logs change. Logging a slot calls `logFood` for each item with that slot id.

## Risks / Trade-offs

- [Greedy can miss protein that a smarter combination would reach] → shows `proteinShortBy` honestly; good enough for 2–4 items per slot.
- [Equal split ignores that dinner is usually bigger than a snack] → acceptable for v1; per-slot weights can be added later without changing the spec.
- [Few staples gives repetitive plans] → the staples warning from onboarding and the "add a protein food" message point users to add more.
