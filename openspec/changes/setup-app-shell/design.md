# Design

## Context

The repo holds a blank Expo SDK 58 TypeScript scaffold (`App.tsx`, `index.ts`) and `docs/SPEC.md`. The owner tests only on an Android phone by installing the debug-signed release APK that GitHub Actions builds (`.github/workflows/android-apk.yml`); there is no local emulator or Metro server in the loop. Requirements are in `specs/`.

## Goals / Non-Goals

**Goals:**
- A file layout every later change can extend without moving code around.
- Business logic in pure TypeScript that unit tests can run in Node.
- A food table whose numbers can be traced to a source.

**Non-Goals:**
- Any onboarding, logging or AI work (later changes).
- iOS builds (Expo keeps the option open; not tested in v1).
- Fuzzy matching (comes with `add-cloud-parsing`).

## Decisions

**Expo Router with `src/app/`.** Routes in `src/app/(tabs)/{index,log,settings}.tsx` plus `src/app/_layout.tsx`. Non-route code lives in `src/core/` (pure logic), `src/db/` (storage), `src/data/` (bundled data) and `src/ui/` (shared components). Alternative: React Navigation directly; rejected because Expo Router is the scaffold's recommended default and gives file-based routes later changes can add to.

**Standalone APK, not a dev client, for phone testing.** The spec mentions a development build because native AI libraries won't run in Expo Go. A dev client needs a Metro server the owner can't run from a phone, so testing uses the CI release APK (`expo prebuild` + `gradlew assembleRelease`, debug-signed). `expo-dev-client` is not added.

**`expo-sqlite` behind a small `Db` interface.** `src/db/db.ts` defines `exec`, `run`, `getAll`, `getFirst` and `transaction`. The app uses an `expo-sqlite` implementation; tests use a `better-sqlite3` implementation (dev dependency) so migrations, seeding and queries run against real SQLite in Jest. Alternative: mocking expo-sqlite; rejected because mocks would not catch SQL errors.

**Migrations via `PRAGMA user_version`.** `src/db/migrations.ts` is an ordered array of SQL steps; on open, steps after the current `user_version` run inside one transaction, then `user_version` is set. Schema v1:
- `profile` (single row, `id = 1`): goal, diet_type, weight_kg, height_cm, age, sex, activity, kcal_target, protein_target_g, slots (JSON array of `{id, name}`), onboarded_at.
- `foods`: id (text), name, aliases (JSON array), category (`veg|egg|non-veg|vegan`), unit, grams_per_unit, kcal_per_100g, protein_per_100g, source (`built-in|usda|openfoodfacts|user|ai-estimated`), external_id, updated_at. Plus a `food_names` table (food_id, normalized name) indexed for alias lookup.
- `staples`: food_id, usual_qty, usual_unit.
- `logs`: id, date (`YYYY-MM-DD` local), slot, food_id, qty, unit, grams, kcal, protein_g, raw_text, estimated (0/1), created_at.
- `meta`: key/value (holds `catalog_version`).
The spec's tables are kept; `food_names`, `meta`, `unit`/`usual_unit` and `external_id` are additions needed by later changes.

**Food data as typed TS modules.** `src/data/foods/indian.ts` and `src/data/foods/usda.ts` export arrays of `FoodSeed` with stable ids (`in-paneer`, `usda-171287`). A `CATALOG_VERSION` constant bumps when data changes. Seeding upserts `built-in`/`usda` rows by id when the stored `catalog_version` is lower and never touches other sources.

**Name normalization.** `normalizeName()` in `src/core/text.ts`: lowercase, trim, collapse spaces, strip punctuation. Used for every name/alias write and lookup.

**Food data sources.** USDA FoodData Central (SR Legacy / Foundation) is public domain and covers the global foods plus Indian items with close equivalents (paneer, plain yogurt, cooked lentils, rice). Values for other Indian staples are taken per item from a cited source and the source is recorded per row in `docs/food-data-sources.md`. IFCT 2017 (NIN) values are used only if its licence permits redistribution; until confirmed, prefer USDA equivalents plus home-recipe calculations from USDA ingredients.

**Tests with `jest-expo`.** `npm test` runs Jest with the `jest-expo` preset. Pure modules and DB modules are tested; screens are checked on the phone.

## Risks / Trade-offs

- [Indian food values may be inaccurate or under an unclear licence] → every row cites its source; a data-validation test checks ranges and that protein × 4 does not exceed kcal; the licence question is in the change list's open questions.
- [`better-sqlite3` needs a native build in CI/Node] → dev dependency only, never bundled; if it fails to install, fall back to `sql.js` (pure WASM) behind the same interface.
- [Expo Router adds dependencies early] → small and recommended; avoids a navigation rewrite later.
- [Debug-signed APK is not a store build] → fine for testing; release signing is planned in `polish-and-release`.
