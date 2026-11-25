# Tasks

## 1. Engine

- [ ] 1.1 Implement portion stepping helpers in `src/core/rebalance.ts` (step size, minimum, 2× usual cap, best portion for a protein or kcal goal); verify unit tests for roti (whole numbers), whey (scoops), paneer (25 g steps, min 50 g) and the cap
- [ ] 1.2 Implement `rebalance()` (diet filter, role split, per-slot budgets, seeded rotation, protein-first fill, second protein when short, carb fill, final kcal fit) and the "nothing to fix" reasons; verify unit tests for every day-rebalance scenario, that total kcal never exceeds remaining kcal across 200 random seeded inputs, and that the same seed gives the same plan
- [ ] 1.3 Implement `swapItem(plan, slotId, index, ...)` and shuffle via seed; verify unit tests that a swap keeps the role, avoids duplicates in the slot and recomputes slot totals

## 2. Screens

- [ ] 2.1 Add the "Fix my day" button to Today and a suggestions view listing each open slot's items with portions, kcal and protein, plus plan totals and "protein still short by" when relevant; verify `npx tsc --noEmit` passes
- [ ] 2.2 Add swap per item, Shuffle, "Log" per slot and per item (via `logFood`), and recompute after logging; verify on the phone
- [ ] 2.3 Show the three "nothing to fix" messages, with a link to Settings → Usual foods for the missing-protein case; verify on the phone

## 3. Test this phase

- [ ] 3.1 Run `npx tsc --noEmit`, `npm test` and `npx expo-doctor`; verify all pass
- [ ] 3.2 Push to main and verify the GitHub Actions APK build succeeds

Manual checks on your Android phone (install the new APK; make sure your usual foods include paneer, whey, roti and rice, and tick chicken too if you're vegetarian):
1. Turn on airplane mode. With nothing logged today, tap "Fix my day": all your slots get suggestions, each with a protein food.
2. Check portions look real: whole roti, whole scoops, paneer in 25 g steps, nothing more than twice your usual amount.
3. Check the plan's total kcal is at or under what the card says is left. If you're vegetarian, chicken never appears.
4. Tap swap on a protein item: it changes to another protein food and the slot totals update. Tap Shuffle: the plan changes.
5. Tap "Log" on one slot: those items appear in Today under that slot, the card updates, and that slot drops out of the suggestions.
6. Log foods until you're over your kcal target, then tap "Fix my day": it says the target is already reached and suggests nothing.
7. In Settings → Usual foods, untick every protein food and tap "Fix my day": it asks you to add a protein food and the link opens Usual foods.
