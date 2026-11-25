# Tasks

## 1. Core logic

- [ ] 1.1 Implement `src/core/portions.ts` (`unitsFor`, `toGrams`, `nutrition`, `validateQty`, display rounding); verify unit tests for 2 roti → 80 g, 1 katori → 150 g, 150 g paneer → 398 kcal / 27.5 g, 0 and 51-unit rejection, 0.5 scoop
- [ ] 1.2 Implement `src/core/summary.ts` (`summarize` with remaining floored at 0, `kcalOverBy`, `proteinMet`, groups by slot incl. "Other"); verify unit tests for every daily-summary scenario
- [ ] 1.3 Implement `todayKey()` and `defaultSlotFor()` in `src/core/day.ts`; verify unit tests for each hour band and for custom slots

## 2. Storage

- [ ] 2.1 Implement `src/db/logs.ts` (`logFood` snapshotting grams/kcal/protein, `updateLog` recomputing from the food, `deleteLog`, `listLogs(date)`); verify tests against the test database, including that editing a food row afterwards does not change an existing entry

## 3. Screens

- [ ] 3.1 Log tab: search box with live results over names and aliases (all diet types), "No foods found" state; verify on the phone
- [ ] 3.2 Log entry sheet: quantity input with fraction support, unit picker with gram hints, slot picker with time-based default, live kcal/protein preview, Save disabled for invalid quantity; verify `npx tsc --noEmit` passes
- [ ] 3.3 Today tab: what's-left card (remaining, eaten/target, kcal-over warning, protein-met badge) and entries grouped by slot with totals; tap an entry to edit or delete; refresh on foreground and after writes; verify on the phone

## 4. Test this phase

- [ ] 4.1 Run `npx tsc --noEmit`, `npm test` and `npx expo-doctor`; verify all pass
- [ ] 4.2 Push to main and verify the GitHub Actions APK build succeeds

Manual checks on your Android phone (install the new APK over the old one; your profile should still be there):
1. Turn on airplane mode. Open Log, type "dah": curd and dal both appear. Type "xyzzy": "No foods found".
2. Pick roti: piece is the default unit; set 2. Check the slot matches the time of day. The preview shows kcal and protein. Save.
3. Today's card drops by that amount and the entry shows under the right slot.
4. Log 1 katori dal and check the preview says about 150 g. Try quantity 0: Save is disabled. Try 0.5 scoop whey: half a scoop's numbers show.
5. Tap the roti entry, change it to 3, save: the card updates. Delete it: the card goes back up.
6. Log enough food to pass your kcal target: the card shows "N kcal over target" and 0 left. Log protein foods past your protein target: "protein target met" appears.
7. Force-close and reopen: all entries are still there.
8. Next day (or change the phone's date forward): the card shows full targets and yesterday's entries are gone from Today.
