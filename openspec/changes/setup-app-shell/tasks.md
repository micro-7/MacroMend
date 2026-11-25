# Tasks

## 1. Project setup

- [ ] 1.1 Install `expo-router` and its peers with `npx expo install` (`expo-linking`, `expo-constants`, `react-native-safe-area-context`, `react-native-screens`), set `"main": "expo-router/entry"`, add the `expo-router` plugin to `app.json`, delete `App.tsx` and `index.ts`; verify `npx tsc --noEmit` passes
- [ ] 1.2 Install `expo-sqlite` with `npx expo install` and add its config plugin if required; verify `npx expo-doctor` reports no dependency issues
- [ ] 1.3 Add Jest with `jest-expo`, `@types/jest` and an `npm test` script; add a trivial passing test; verify `npm test` exits 0

## 2. Storage layer

- [ ] 2.1 Create `src/db/db.ts` (`Db` interface) with an `expo-sqlite` implementation and a `better-sqlite3` test implementation; verify a test can open an in-memory database and run a query
- [ ] 2.2 Write `src/db/migrations.ts` with schema v1 (profile, foods, food_names, staples, logs, meta) and a `migrate(db)` runner using `PRAGMA user_version`; verify tests for: fresh database gets all tables, running twice is a no-op, a simulated v0→v1 upgrade keeps existing rows
- [ ] 2.3 Add `src/db/open.ts` that opens and migrates the database once at startup and exposes it through a React context; verify by test that a failed migration rejects with an error instead of continuing

## 3. Food catalog

- [ ] 3.1 Add `src/core/text.ts` with `normalizeName()`; verify unit tests for case, spacing and punctuation
- [ ] 3.2 Define the `FoodSeed` type and author `src/data/foods/indian.ts` with at least 150 Indian staples (English + Hindi/Hinglish aliases such as dahi/curd, chapati/roti, chawal/rice, anda/egg), default units and grams per unit; record each value's source in `docs/food-data-sources.md`; verify the data-validation test in 3.4 passes
- [ ] 3.3 Author `src/data/foods/usda.ts` with at least 150 common global foods from USDA FoodData Central (chicken breast, eggs, oats, pasta, fish, milk, whey, tofu and more) with FDC ids; verify the data-validation test in 3.4 passes
- [ ] 3.4 Add a data-validation test: unique ids, no alias shared by two foods after normalization, valid categories and sources, non-negative numbers, grams_per_unit > 0, protein × 4 ≤ kcal per 100 g (+5% tolerance); verify `npm test` passes
- [ ] 3.5 Implement `src/db/foods.ts` with `seedCatalog(db)` (upsert built-in/usda rows when `CATALOG_VERSION` is newer, never touching other sources), `countFoods`, `getFoodById` and `findFoodByExactName` (name or alias via `food_names`); verify tests: first seed loads ≥300 foods, re-seed keeps a `user` food unchanged, "dahi" and " Paneer  " resolve correctly

## 4. App screens

- [ ] 4.1 Create `src/app/_layout.tsx` that opens the database and seeds the catalog before rendering, with a loading state and an error screen with Retry; verify by test of the startup function that errors surface instead of being swallowed
- [ ] 4.2 Create the tab layout with Today (placeholder text), Log (placeholder text) and Settings tabs, Today as default; verify `npx tsc --noEmit` passes
- [ ] 4.3 Settings screen shows the app version (from `expo-constants`) and the food count from the database; verify on the phone (see Test this phase)
- [ ] 4.4 Set `app.json` name "MacroMend", slug, Android package `com.macromend.app`, portrait orientation; verify `npx expo prebuild --platform android --no-install` runs without errors locally or in CI

## 5. Test this phase

- [ ] 5.1 Run `npx tsc --noEmit`, `npm test` and `npx expo-doctor`; verify all pass
- [ ] 5.2 Push to main and verify the "Android APK" GitHub Actions run succeeds and uploads `macromend-apk`

Manual checks on your Android phone (install the APK from the GitHub Actions run):
1. Turn on airplane mode, then install and open the APK. The app opens with no sign-in and no error.
2. The Today tab is selected; tap Log, then Settings, and each screen appears.
3. Settings shows a version number and "foods loaded" of at least 300.
4. Force-close the app from Recents and open it again: it opens straight to Today with the same food count.
