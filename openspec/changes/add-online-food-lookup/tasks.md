# Tasks

## 1. Lookup clients

- [ ] 1.1 Implement `src/lookup/usda.ts` (search, nutrient 1008/1003 extraction, user key or DEMO_KEY); verify unit tests with recorded USDA responses
- [ ] 1.2 Implement `src/lookup/off.ts` (search, kcal/protein extraction incl. kJ conversion, serving size, category guess from labels, User-Agent header); verify unit tests with recorded OFF responses, including products missing nutrients being dropped
- [ ] 1.3 Implement `src/lookup/search.ts` (parallel, 8 s timeouts, merge, dedupe, cap 10, offline and disabled short-circuits); verify unit tests with mocked clients

## 2. Saving and estimates

- [ ] 2.1 Add migration v3 (`settings` table) and `saveExternalFood()` with aliases and external ids; verify tests: saved food is found by `findFoodByExactName` and survives catalog re-seed
- [ ] 2.2 Implement `src/lookup/estimate.ts` (estimate prompt, zod schema, range checks) using the provider chain; verify unit tests for a valid estimate, the 50 kcal / 40 g rejection and invalid JSON
- [ ] 2.3 Set `estimated = 1` in `logFood()` for ai-estimated foods and switch source to `user` when an estimate is marked checked; verify unit tests

## 3. Screens

- [ ] 3.1 Add "Search online" to Not found items on the confirm list and to empty manual search: result list with source, brand, per-100 g values and attribution; category confirm sheet; save then continue logging; verify on the phone
- [ ] 3.2 Add the AI estimate flow ("None of these" / no results): review sheet with editable values and "Estimated by AI — check before saving"; manual entry when rejected or no provider; verify on the phone
- [ ] 3.3 Show "est." on estimated entries in Today; add Settings → My foods (list, edit, mark checked, delete) and Settings → Food lookup (switch, USDA key); verify on the phone

## 4. Test this phase

- [ ] 4.1 Run `npx tsc --noEmit`, `npm test` and `npx expo-doctor`; verify all pass
- [ ] 4.2 Push to main and verify the GitHub Actions APK build succeeds

Manual checks on your Android phone (install the new APK; keep at least one AI provider from the last phase):
1. Log tab: type "1 scoop muscleblaze whey". If it's Not found, tap "Search online": Open Food Facts products appear with kcal/protein per 100 g and an Open Food Facts credit.
2. Pick one, confirm its category, log it. Turn on airplane mode and type "muscleblaze whey" again: it's matched without going online.
3. Turn airplane mode off. In manual search, type something not in the table (e.g. "quinoa salad"): tap "Search online" and see USDA results.
4. Type "1 plate dhaba butter chicken". Search online, tap "None of these", then ask for an estimate: an editable estimate appears labelled as AI. Save and log it: Today shows "est." on that entry.
5. Settings → My foods: the saved foods are listed. Edit the butter chicken, tick "values checked", save. Log it again: the new entry has no "est.".
6. Settings → Food lookup: turn online lookup off. Type an unknown food: no online search runs, and you get manual pick or AI estimate instead.
7. Airplane mode on, unknown food: the app says online search needs internet.
