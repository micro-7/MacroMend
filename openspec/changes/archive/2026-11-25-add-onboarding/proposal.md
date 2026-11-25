# Proposal

## Why

Every later feature (what's-left card, "Fix my day", diet filtering) needs the user's goal, daily targets, diet type, meal slots and usual foods. The spec asks for a setup that takes about a minute with no login (docs/SPEC.md, MVP feature 1), and the user must be able to change these later in Settings (MVP feature 5).

## What Changes

- First-run onboarding flow: goal (cut, maintain, bulk) → daily targets (typed, or calculated from weight, height, age, sex and activity) → diet type → meal slots → usual foods (staples).
- Target calculator: Mifflin-St Jeor BMR × activity factor, adjusted for goal, with protein from body weight.
- Meal slots default to breakfast, lunch, snack, dinner; the user can rename, add (e.g. pre-workout), remove and reorder them.
- Staples picker: tick usual foods from the food table, filtered by diet type by default, with a usual quantity.
- Settings gains "Profile & targets", "Meal slots" and "Usual foods" screens to edit everything set during onboarding.
- Onboarding shows once; the app opens on Today afterwards.
- The AI setup step from the spec is not part of this change; it is added by `add-cloud-parsing` and `add-on-device-fallback`.

## Capabilities

### New Capabilities
- `onboarding`: the first-run flow, its order, skipping and completion.
- `user-profile`: goal, diet type and body details, stored on the phone and editable later.
- `daily-targets`: daily kcal and protein targets, typed or calculated.
- `meal-slots`: the user's list of meal slots and how it is edited.
- `staples`: the user's usual foods and usual quantities.

### Modified Capabilities
None.

## Impact

- New routes: `src/app/onboarding/*` and `src/app/settings/{profile,slots,staples}.tsx`.
- New pure modules `src/core/targets.ts`, `src/core/slots.ts`; storage modules `src/db/profile.ts`, `src/db/staples.ts`.
- Uses the `profile` and `staples` tables from `setup-app-shell`; no schema change expected.
