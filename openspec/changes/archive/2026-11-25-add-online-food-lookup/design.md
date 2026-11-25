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

**Checked against the real services.** On 2026-11-25 the actual USDA and Open Food Facts responses were fetched and the parsers and test fixtures are built from them (`src/lookup/__fixtures__/responses.ts` marks which parts are real and which are hand-made variants). USDA search results carry nutrients as `foodNutrients[]` with `nutrientNumber` "208" (energy, KCAL) and "203" (protein), per 100 g, plus `servingSize` and `householdServingFullText`; reference foods may report energy as 957/958 instead of 208, which is also accepted. Open Food Facts search gives `energy-kcal_100g`, `energy_100g` (kJ) and `proteins_100g`, plus `serving_quantity`.

**USDA client (`src/lookup/usda.ts`).** `GET https://api.nal.usda.gov/fdc/v1/foods/search?query=…&pageSize=10&dataType=Foundation,SR Legacy,Branded&api_key=…`. Energy is nutrient 1008 (kcal) and protein 1003. Uses the user's key if set, otherwise `DEMO_KEY` (heavily rate-limited; Settings explains how to get a free key).

**Open Food Facts client (`src/lookup/off.ts`).** Search API with `fields=code,product_name,brands,nutriments,serving_quantity,labels_tags,ingredients_analysis_tags`, reading `energy-kcal_100g` (or `energy_100g` ÷ 4.184) and `proteins_100g`. Sends a `User-Agent: MacroMend/<version>` header as OFF asks. Products without both values are dropped. Category guess from `en:vegan`/`en:vegetarian` labels and analysis tags; otherwise unset and the user must choose.

**Combined search (`src/lookup/search.ts`).** Both clients run in parallel with an 8 s timeout each; results merged (OFF first for branded-looking queries containing a known brand word, else USDA first), deduplicated by normalized name + brand, capped at 10.

**Saved foods are told apart by id, not by source.** A food saved from USDA has source `usda`, the same as the bundled USDA rows, so its id starts with `ext-` and the catalog update only replaces or removes rows whose source is `built-in` or `usda` and whose id does not start with `ext-`. Foods the user saved also win ties when the typed words match both a saved and a bundled food (exact name still beats alias), so picking a specific "Yoga Bar" product once makes "yoga bar" mean that product afterwards.

**One chain for every AI task.** `runProviders()` in `src/ai/chain.ts` runs any task over the user's providers with the same order, holds and 8 s timeout; reading a meal and estimating a food both use it.

**Where it appears.** The online flow (`OnlineFoodFlow`) is one sheet with steps: results → category → saved; or "None of these" → AI estimate (editable, labelled) → saved; or manual entry whenever the AI cannot be used. It opens from a Not found item on the confirm screen and from an empty manual search on the Log tab. After saving, the confirm screen switches the item to the new food and the Log tab opens the entry form for it.

**Saving.** `saveExternalFood()` inserts a `foods` row with `source`, `external_id` (`fdc:<id>` / `off:<code>`), unit `serving` with `grams_per_unit = serving_quantity` when known, else `g`/100, and adds the searched name and product name to `food_names`. Saved rows are never touched by catalog seeding (already guaranteed in `setup-app-shell`).

**AI estimate (`src/lookup/estimate.ts`).** Uses the same provider chain with a second prompt asking for `{"name","kcal_per_100g","protein_per_100g","unit","grams_per_unit","category"}` and its own zod schema plus the range checks from the spec. This is the only path where a model supplies numbers, and the result is always shown for review and saved as `ai-estimated`.

**Estimated flag.** `logFood()` sets `estimated = 1` when the food's source is `ai-estimated`. Editing a food and ticking "values checked" changes its source to `user`.

**Settings.** Settings → Food lookup holds the on/off switch and the optional USDA key (secure storage, like AI keys); Settings → My foods lists saved foods (never the bundled table), edits them with the same form used for estimates, and deletes them. Entries logged earlier keep the numbers they were saved with, and entries logged before "Values checked" keep their "est." mark.

**Settings (storage).** A `settings` key/value table (migration v3) holds `online_lookup_enabled` and the USDA key reference; the key itself is stored in secure storage like provider keys.

## Risks / Trade-offs

- [`DEMO_KEY` limits (about 30 requests/hour) are easy to hit] → OFF still works, and Settings links to the free USDA key sign-up.
- [OFF data quality varies] → values are shown before saving and can be edited in My foods.
- [ODbL share-alike applies to the database, not the app] → attribution is shown; saved OFF rows stay on the phone and are not redistributed.
- [AI estimates can be badly wrong] → range checks, "est." marks, and review before saving.
