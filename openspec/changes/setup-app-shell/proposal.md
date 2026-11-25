# Proposal

## Why

MacroMend needs a working app skeleton before any feature can ship: an Android build that installs on a phone, an on-phone database, and the food table every later number comes from (see docs/SPEC.md, "Architecture"). Nothing else in the change order can be tested on a phone until this exists.

## What Changes

- Turn the Expo TypeScript scaffold into an Expo Router app with three tabs: Today, Log, Settings (Log and Today are placeholders for now).
- Add an on-phone SQLite database with the four MVP tables (`profile`, `foods`, `staples`, `logs`) and versioned migrations.
- Bundle a food table: about 150 Indian staples with English and Hindi/Hinglish aliases, plus a few hundred common global foods from USDA FoodData Central, each tagged with a diet category.
- Seed the food table on first launch and on catalog updates without touching user-saved foods.
- Add unit-test tooling (`npm test`) so every later change can land tests.
- Settings shows the app version and how many foods are loaded, so a phone install can be checked.

## Capabilities

### New Capabilities
- `app-shell`: launching the app offline with no login, tab navigation, and the basic Settings info screen.
- `local-storage`: the on-phone database, its tables, persistence across restarts and safe schema upgrades.
- `food-catalog`: the bundled food table, its fields (aliases, category, units, nutrition per 100 g, source) and exact name/alias lookup.

### Modified Capabilities
None.

## Impact

- New dependencies: `expo-router` (and its peers), `expo-sqlite`, Jest via `jest-expo`, and a Node SQLite driver for tests only.
- Replaces the scaffold's `App.tsx`/`index.ts` entry with Expo Router's `src/app/` routes.
- Adds `src/db/`, `src/core/` and `src/data/foods/` source trees and `docs/food-data-sources.md`.
- The GitHub Actions APK workflow (already in the repo) starts producing an installable app.
