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

**Food data as typed TS modules.** `src/data/foods/indian.ts`, `src/data/foods/usda.ts` and `src/data/foods/global.ts` export arrays of `FoodSeed` with stable ids (`in-paneer`, `usda-egg`). A `CATALOG_VERSION` constant bumps when data changes. Seeding upserts `built-in`/`usda` rows by id when the stored `catalog_version` is lower and never touches other sources.

**Name normalization.** `normalizeName()` in `src/core/text.ts`: lowercase, trim, collapse spaces, strip punctuation. Used for every name/alias write and lookup.

**Food data sources.** `usda.ts` holds real rows from USDA FoodData Central Foundation Foods (public domain), each with its FDC id; the values are exactly FDC's, and many are raw or dry foods, so names say so. `global.ts` holds common foods FDC Foundation does not cover, and `indian.ts` holds Indian staples and dishes, both as typed reference values with source `built-in` and no FDC id. Sources are recorded per group, with caveats, in `docs/food-data-sources.md`. IFCT 2017 (NIN) values are not used: its licence for redistribution is unconfirmed, and checking the Indian values against it is a pre-release task in `polish-and-release`.

**Tests with `jest-expo`.** `npm test` runs Jest with the `jest-expo` preset. Pure modules and DB modules are tested; screens are checked on the phone.

## Risks / Trade-offs

- [Indian food values may be inaccurate or under an unclear licence] → `docs/food-data-sources.md` states each group's source and caveats; a data-validation test checks ranges and that protein × 4 does not exceed kcal; checking the Indian values against IFCT/NIN and the licence is a pre-release task in `polish-and-release`.
- [`better-sqlite3` needs a native build in CI/Node] → dev dependency only, never bundled; if it fails to install, fall back to `sql.js` (pure WASM) behind the same interface.
- [Expo Router adds dependencies early] → small and recommended; avoids a navigation rewrite later.
- [Debug-signed APK is not a store build] → fine for testing; release signing is planned in `polish-and-release`.
