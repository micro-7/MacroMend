# Proposal

## Why

MacroMend works, but it looks plain: white screens, text lists and default green buttons. The owner wants it to feel modern, friendly and interactive, and shared a reference design (dark charcoal base, rounded cards, an elegant serif headline font, a green "hero" card with one clear action, small progress rings, icon tiles and a floating tab bar with a coral highlight). All MVP features are built and archived, so this is the right moment to give the whole app one consistent look before anything is published.

## What Changes

- A dark-first visual style used on every screen: charcoal background, lighter rounded cards, brand green for main actions and hero cards, coral as the highlight colour, a serif font for headings (with italic emphasis words) and a clean sans-serif for everything else. Fonts and icons are bundled, so the app still works fully offline.
- Today screen redesigned like the reference:
  - A greeting by time of day and name ("Good evening, Mihir").
  - A green hero card, "Not sure *what* to *eat* next?", with a white **Fix my day** button.
  - Three small progress rings: calories left, protein left, meals logged.
  - Meal slots shown as cards with a line icon, their totals and their logged foods.
- A floating pill-shaped tab bar (Today, Log, Settings) with line icons and a coral circle on the active tab.
- Log, confirm, Fix my day, Settings, phone model, About and onboarding screens restyled with the same cards, buttons, chips, inputs and headers; the phone model download gets a real progress bar.
- Small interactive touches: rings fill with a short animation, buttons react when pressed, a light vibration when food is logged, and friendly empty states.
- An optional name: asked on the first onboarding step ("What should we call you?") and editable in Settings → Profile & targets. It never leaves the phone.
- No change to how food is logged, parsed, matched or counted, or to any number the app shows.

## Capabilities

### New Capabilities
- `app-appearance`: the app's visual style and interaction feedback: dark theme, colour roles, fonts, readable contrast, the floating tab bar, press feedback, logging vibration and offline-bundled assets.

### Modified Capabilities
- `daily-summary`: the "What's left" card becomes a greeting, a hero card with Fix my day, and progress rings including meals logged; today's entries are shown as meal cards.
- `user-profile`: the profile gains an optional display name, editable in Settings.
- `onboarding`: the first step also asks for the optional name.

## Impact

- Code: `src/ui/theme.ts` becomes a full set of design tokens; `src/ui/kit.tsx`, `Screen.tsx`, `WhatsLeftCard.tsx` and the other `src/ui` components are restyled; every screen in `src/app` picks up the new components; the tabs layout gets a custom tab bar.
- Database: one migration adds a nullable `name` column to `profile`; "Delete all my data" already clears it.
- New dependencies (Expo SDK 58 versions): `react-native-svg` (rings, icons), `@expo/vector-icons` (line icons), `expo-font` plus two bundled Google Fonts packages (serif headings and sans-serif body), `expo-haptics` (vibration). `react-native-reanimated` is already installed. Expected APK growth about 1 to 2 MB.
- Tests: existing render tests that look for text keep passing; new tests for the rings, greeting and name storage.
- Not in scope: a light theme (tokens make it easy later), photos or food images, any change to features or numbers.
