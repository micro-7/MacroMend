# Proposal

## Why

The bundled table covers Indian staples and common global foods, but users also eat branded products (Amul, MuscleBlaze, Yoga Bar) and dishes the table lacks. Today those items stop at "Not found". The spec's lookup order (docs/SPEC.md, "How one log flows" step 4 and "Food data sources") fills that gap: USDA FoodData Central and Open Food Facts first, then an AI estimate that is always marked "estimated".

## What Changes

- When a food is not in the table (from text logging or manual search), search USDA FoodData Central and Open Food Facts online and show the results to pick from.
- A picked result is saved into the local food table (source `usda` or `openfoodfacts`) with the searched name as an alias, so next time it is found offline.
- If nothing suitable is found, ask the user's AI providers for an estimate of kcal and protein per 100 g; the user reviews and can edit it before saving; it is saved with source `ai-estimated`.
- Entries logged from estimated foods are marked "est." on Today.
- Saved foods (online or estimated) can be edited or deleted in Settings → My foods.
- Settings: an "Online food lookup" switch (on by default) and an optional USDA API key field.
- Attribution for Open Food Facts (ODbL) and USDA shown where results appear.

## Capabilities

### New Capabilities
- `online-food-lookup`: searching USDA and Open Food Facts for missing foods, AI estimates as last resort, saving results to the local table and managing saved foods.

### Modified Capabilities
None.

## Impact

- New modules `src/lookup/usda.ts`, `src/lookup/off.ts`, `src/lookup/estimate.ts`, `src/lookup/search.ts`.
- Extends the confirm list from `add-cloud-parsing` and the manual search from `add-manual-logging` with online results.
- Reuses the provider chain from `add-cloud-parsing` with a separate estimate prompt and schema.
- Network: `api.nal.usda.gov` and `world.openfoodfacts.org`; only the food name is sent.
