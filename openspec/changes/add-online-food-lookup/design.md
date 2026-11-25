# Design

## Context

Builds on the `foods`/`food_names` tables and `findFoodByExactName` (`setup-app-shell`), manual search and `logFood` (`add-manual-logging`), and the confirm list, provider chain, zod validation and `expo-network` (`add-cloud-parsing`). Requirements are in `specs/`.

## Goals / Non-Goals

**Goals:**
- Lookups are optional extras: every failure falls back to manual pick or manual entry.
- Saved results behave exactly like built-in foods afterwards.

**Non-Goals:**
- Barcode scanning (later), bulk import, syncing saved foods anywhere.

## Decisions

**USDA client (`src/lookup/usda.ts`).** `GET https://api.nal.usda.gov/fdc/v1/foods/search?query=…&pageSize=10&dataType=Foundation,SR Legacy,Branded&api_key=…`. Energy is nutrient 1008 (kcal) and protein 1003. Uses the user's key if set, otherwise `DEMO_KEY` (heavily rate-limited; Settings explains how to get a free key).

**Open Food Facts client (`src/lookup/off.ts`).** Search API with `fields=code,product_name,brands,nutriments,serving_quantity,labels_tags,ingredients_analysis_tags`, reading `energy-kcal_100g` (or `energy_100g` ÷ 4.184) and `proteins_100g`. Sends a `User-Agent: MacroMend/<version>` header as OFF asks. Products without both values are dropped. Category guess from `en:vegan`/`en:vegetarian` labels and analysis tags; otherwise unset and the user must choose.

**Combined search (`src/lookup/search.ts`).** Both clients run in parallel with an 8 s timeout each; results merged (OFF first for branded-looking queries containing a known brand word, else USDA first), deduplicated by normalized name + brand, capped at 10.

**Saving.** `saveExternalFood()` inserts a `foods` row with `source`, `external_id` (`fdc:<id>` / `off:<code>`), unit `serving` with `grams_per_unit = serving_quantity` when known, else `g`/100, and adds the searched name and product name to `food_names`. Saved rows are never touched by catalog seeding (already guaranteed in `setup-app-shell`).

**AI estimate (`src/lookup/estimate.ts`).** Uses the same provider chain with a second prompt asking for `{"name","kcal_per_100g","protein_per_100g","unit","grams_per_unit","category"}` and its own zod schema plus the range checks from the spec. This is the only path where a model supplies numbers, and the result is always shown for review and saved as `ai-estimated`.

**Estimated flag.** `logFood()` sets `estimated = 1` when the food's source is `ai-estimated`. Editing a food and ticking "values checked" changes its source to `user`.

**Settings.** A `settings` key/value table (migration v3) holds `online_lookup_enabled` and the USDA key reference; the key itself is stored in secure storage like provider keys.

## Risks / Trade-offs

- [`DEMO_KEY` limits (about 30 requests/hour) are easy to hit] → OFF still works, and Settings links to the free USDA key sign-up.
- [OFF data quality varies] → values are shown before saving and can be edited in My foods.
- [ODbL share-alike applies to the database, not the app] → attribution is shown; saved OFF rows stay on the phone and are not redistributed.
- [AI estimates can be badly wrong] → range checks, "est." marks, and review before saving.
