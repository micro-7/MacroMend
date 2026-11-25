# Tasks

## 1. Foundations

- [x] 1.1 Install `react-native-svg`, `@expo/vector-icons`, `expo-font`, `expo-haptics`, `@expo-google-fonts/instrument-serif` and `@expo-google-fonts/inter` at Expo SDK 58 versions; verify `npx expo-doctor` passes and `npx expo export --platform android` bundles
- [x] 1.2 Replace `src/ui/theme.ts` with design tokens (colour roles, spacing, radii, type scale) keeping the old names as aliases; verify a unit test checks every text/background pair has at least 4.5:1 contrast (3:1 for large headings)
- [x] 1.3 Load the fonts in the root layout behind the splash screen with a fallback timeout; set `userInterfaceStyle: "dark"`, a dark splash background and light status bar; verify the app starts offline in a test render and `npx expo config --type public` shows the dark settings
- [x] 1.4 Build shared components (Screen, Title with `*italic*` words, Card, HeroCard, Button variants, Chip, Field, SectionHeader, EmptyState, ProgressBar, ProgressRing with animation, press feedback) and a `logHaptic()` helper that never throws; verify render tests for Title italics, ProgressRing values (0%, 50%, over 100%) and Button press states
- [x] 1.5 Replace the tab bar with the floating pill bar (line icons, labels, animated coral circle on the active tab, same accessibility labels); verify a render test that the active tab is marked and tapping switches tabs

## 2. Name and greeting

- [x] 2.1 Add migration v4 (`profile.name`), `Profile.name` (trimmed, max 30, blank → null) and save/load; verify tests for upgrade from v3 with data kept, blank-to-null, the 30-character limit, and that `wipeAllData` clears it
- [x] 2.2 Add `greeting(date, name)` (morning before 12:00, afternoon before 17:00, evening otherwise); verify unit tests at 09:00, 13:00 and 19:30 with and without a name
- [x] 2.3 Add the optional "What should we call you?" field to the onboarding goal step and to Settings → Profile & targets; verify onboarding tests that an empty name does not block Next and that Back keeps the name

## 3. Today

- [x] 3.1 Rebuild Today: greeting row, hero card ("Not sure *what* to *eat* next?" with a white Fix my day button), three rings (calories left, protein left, meals logged x of y) with the warning colour when over target, and meal slot cards with icons, totals, entries and empty states; verify render tests for the scenarios in the daily-summary spec (1560 kcal / 112.8 g left, 150 kcal over, protein met, 2 of 5 meals, grouped cards, hero opens Fix my day)

## 4. Logging screens

- [x] 4.1 Restyle Log (search field, result cards, usual-food chips, AI button, failure and notice cards), the entry screen, confirm list and online food flow with the new components; add `logHaptic()` after every successful save; verify existing Log, ConfirmList and OnlineFoodFlow tests pass and a test that a save calls the haptic helper once
- [x] 4.2 Restyle Fix my day (PlanView meal cards, Swap/Log chips, Shuffle) and add `logHaptic()` on Log; verify existing PlanView tests pass

## 5. Settings, phone model and onboarding

- [ ] 5.1 Restyle Settings (grouped cards with line icons per row) and every manage screen (profile, slots, usual foods, AI providers and editor, my foods, food, food lookup, About); verify existing tests pass and every screen renders without the old white background
- [ ] 5.2 Restyle Phone model with a ProgressBar for the download, and Test phone model with a score card; verify a render test that the progress bar shows the percentage
- [ ] 5.3 Restyle all onboarding steps and the error screen; remove the old colour aliases; verify `grep` finds no use of the old alias names and all onboarding tests pass

## 6. Test this phase

- [ ] 6.1 Run `npx tsc --noEmit`, `npm test` and `npx expo-doctor`; verify all pass
- [ ] 6.2 Push to main and verify the GitHub Actions APK build succeeds and the APK is no more than about 2 MB larger than before

Manual checks on your Android phone (install the new APK over the old one; your data should stay):
1. Open the app in airplane mode: dark screens, serif headings and icons all show; no white flash at launch.
2. Today greets you by time of day ("Good evening"). Settings → Profile & targets: set your name, save; Today now says "Good evening, <name>".
3. Today shows the green "Not sure what to eat next?" card; its Fix my day button opens Fix my day.
4. The three rings show calories left, protein left and meals logged (for example 2 of 5). Log something: the rings animate to the new values and the phone vibrates once.
5. Log past your calorie target: the calorie ring turns amber and the "kcal over target" warning shows.
6. Meal cards show an icon, the totals and your entries; empty meals say so. Tap an entry: it opens for editing.
7. The floating tab bar: tap Log and Settings; the coral circle moves to the tab you tapped.
8. Go through Log → Log it with AI → confirm, Fix my day, Settings screens, Phone model and About: everything is dark, readable and still works as before.
9. Settings → About → Delete all my data (only when you are done testing): onboarding starts with the new look, and the goal step asks "What should we call you?"; leaving it empty still lets you continue.
