# Design

## Context

Builds on `setup-app-shell`: Expo Router tabs, the `Db` interface, the `profile` and `staples` tables, and `findFoodByExactName`/food search over `food_names`. Requirements are in `specs/`.

## Goals / Non-Goals

**Goals:**
- Pure, tested functions for target maths, diet filtering and slot editing.
- One set of form components reused by onboarding and Settings.

**Non-Goals:**
- AI setup step (added by `add-cloud-parsing` / `add-on-device-fallback`).
- Weight tracking over time, units other than kg/cm.

## Decisions

**Routing gate in the root layout.** `src/app/_layout.tsx` reads `profile.onboarded_at`; if null it redirects to `/onboarding/goal`, else to the tabs. Onboarding answers are kept in a React context (`OnboardingDraft`) and written to the database in one transaction on the last step, which is what makes an interrupted run restart cleanly. Alternative: save after each step; rejected because a half-written profile would need extra "incomplete" states.

**Target formulas in `src/core/targets.ts`.**
- BMR (Mifflin-St Jeor): `10·kg + 6.25·cm − 5·age + 5` (male) or `− 161` (female).
- Activity factors: sedentary 1.2, light 1.375, moderate 1.55, very active 1.725, athlete 1.9.
- Goal: cut × 0.8, maintain × 1.0, bulk × 1.1; round only the final value to the nearest 10 kcal; floor 1200.
- Protein: cut 2.0, maintain 1.6, bulk 1.8 g per kg body weight; round to nearest 5 g.
These are common defaults, not medical advice; the screen says so and the user can edit the numbers.

**Diet filter in `src/core/diet.ts`.** `allowedCategories(dietType)` returns the category set from the user-profile spec; every later suggestion feature uses this one function.

**Slots as `{id, name}` JSON in `profile.slots`.** Ids are stable slugs generated on creation (`breakfast`, `lunch`, `snack`, `dinner`, `slot-<random>`); logs store the id. `src/core/slots.ts` holds pure `rename/add/remove/move/validate` functions. Removing a slot that has logs today is allowed; those logs remain and show under "Other" on Today (handled in `add-manual-logging`).

**Staples quick picks.** A static list of food ids per diet type in `src/data/quickPicks.ts`, filtered to ids that exist in the catalog.

**"Protein food" vs "carb food".** Needed for the staples warning and for `add-rebalance`. `src/core/foodRole.ts`: a food is a protein food when protein provides at least 20% of its kcal (protein × 4 ÷ kcal ≥ 0.2), otherwise a carb/other food. (First drafted as 25%, but dal is 24% in the food table, so 25% would have made it a carb; at 20% dal, curd, paneer, eggs and whey count as protein while roti, rice and oats do not.) Derived, not stored, so catalog updates can't drift.

## Risks / Trade-offs

- [Formula defaults may not suit everyone (e.g. very high body fat)] → numbers are always editable; typed targets are the first option.
- [Sex is binary in the formula] → users who prefer not to choose can type targets directly.
- [20% protein-energy threshold misclassifies some foods (e.g. milk at 21% and curd at 23% count as protein foods; rajma and chole at 17% do not)] → acceptable for v1; dal, curd and milk counting as protein is the expected Indian veg behaviour. Revisit if suggestions feel wrong.
