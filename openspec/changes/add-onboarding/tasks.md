# Tasks

## 1. Core logic

- [ ] 1.1 Implement `src/core/targets.ts` (BMR, activity factors, goal adjustment, protein per kg, rounding, 1200 floor, range validation for typed values); verify unit tests cover the spec's 75 kg / 175 cm / 30 y male example for cut, maintain and bulk, a female example, and the floor
- [ ] 1.2 Implement `src/core/diet.ts` `allowedCategories()` and `isAllowed(food, dietType)`; verify unit tests for all four diet types
- [ ] 1.3 Implement `src/core/slots.ts` (defaults, add, rename, remove, move, validate unique non-empty names, 1–8 slots, stable ids); verify unit tests for each spec scenario
- [ ] 1.4 Implement `src/core/foodRole.ts` (protein food if protein×4/kcal ≥ 0.25); verify unit tests with paneer, whey, dal (protein) and roti, rice (carb)

## 2. Storage

- [ ] 2.1 Implement `src/db/profile.ts` (`getProfile`, `saveProfile`, `completeOnboarding` in one transaction with staples); verify tests against the test database that a completed profile round-trips and that nothing is saved before completion
- [ ] 2.2 Implement `src/db/staples.ts` (`listStaples`, `setStaples`, `updateUsualQty`) and a `searchFoods(query, {categories})` that matches names and aliases by substring; verify tests: "dahi" finds curd, vegetarian filter hides chicken

## 3. Onboarding screens

- [ ] 3.1 Add the onboarding gate in the root layout and the `OnboardingDraft` context; verify by test of the gate function that a null `onboarded_at` routes to onboarding
- [ ] 3.2 Build the goal, targets (typed / calculate toggle with result preview and floor note), diet type, meal slots and staples steps with Back/Next; verify `npx tsc --noEmit` passes
- [ ] 3.3 Staples step: quick-pick row, search, diet filter with "Show all foods", usual quantity editor, empty-staples warning; verify on the phone (see Test this phase)

## 4. Settings screens

- [ ] 4.1 Add Settings entries "Profile & targets", "Meal slots" and "Usual foods" reusing the onboarding components; verify edits persist after restart on the phone

## 5. Test this phase

- [ ] 5.1 Run `npx tsc --noEmit`, `npm test` and `npx expo-doctor`; verify all pass
- [ ] 5.2 Push to main and verify the GitHub Actions APK build succeeds

Manual checks on your Android phone (install the APK from GitHub Actions; uninstall the old one first or clear app data so onboarding shows):
1. Open the app: onboarding starts at "Goal". Pick Cut, tap Next.
2. On targets, choose "Calculate": enter 75 kg, 175 cm, 30, male, moderate. It suggests 2110 kcal and 150 g protein. Tap Back, check Cut is still selected, then come forward again.
3. Switch to typing: enter 500 kcal and check you can't continue; enter 1800 kcal / 120 g instead.
4. Pick Vegetarian. On meal slots, add "Pre-workout", move it above Dinner, try renaming Snack to "lunch" (should be refused).
5. On usual foods, check chicken isn't listed; type "dahi" and see curd; tick curd, paneer, roti and whey; set roti to 3.
6. Finish: the Today tab appears. Force-close and reopen: onboarding does not show again.
7. Settings → Profile & targets: change diet type to Non-veg and weight to 72, tap Recalculate, save. Reopen the app and check the new values are kept.
8. Settings → Usual foods: chicken is now listed; tick it and check it stays ticked after a restart.
9. Clear app data, start onboarding, close the app on the slots step and reopen: onboarding starts again from Goal.
