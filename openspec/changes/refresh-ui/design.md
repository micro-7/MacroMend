# Design

## Context

Every screen styles itself with `StyleSheet` and a seven-colour `colors` object in `src/ui/theme.ts`; 31 files import it and about 120 places set font sizes or weights by hand. Shared pieces live in `src/ui/kit.tsx` (Button, OptionRow, Field, Hint, StepScreen), `Screen.tsx` and `WhatsLeftCard.tsx`. Tabs use Expo Router's default tab bar with emoji icons. There is no icon set, no SVG and no custom font; `react-native-reanimated` 4.7.1 is already installed (it came with the phone model). The look follows the owner's reference (see proposal.md - Why). Testing happens only on the owner's Android phone, so each stage must be checkable on its own.

## Goals / Non-Goals

**Goals:**
- One set of design tokens and shared components that every screen uses, so the look stays consistent and a light theme can be added later by swapping tokens.
- Visual changes only: no change to stored data other than the optional name, and no change to any calculation.
- Keep render tests meaningful: visible texts and accessibility labels that tests rely on stay the same unless a spec changes them.

**Non-Goals:**
- A light theme or a theme switch (tokens make it possible later).
- Photos, food images or remote assets.
- New navigation structure; routes stay as they are.

## Decisions

**Tokens in `src/ui/theme.ts`.** Replace the colour object with roles: `bg #121212`, `card #1E1E1E`, `cardHigh #2A2A2A`, `border #2F2F2F`, `text #F5F5F2`, `muted #A3A3A0`, `brand #3F6B4E` (hero/green cards), `brandBright #5FA777` (buttons, rings), `coral #F26B4F` (active tab, highlights), `warning #F0A64A` (over target), `danger #FF6B6B`, plus `onBrand #FFFFFF`. Also spacing (4/8/12/16/24/32), radii (12 cards, 20 hero, 999 pills) and a type scale. Every text/background pair is checked for 4.5:1 contrast by a unit test over the token table. Alternative: a styling library (NativeWind, Tamagui); rejected to avoid a new build pipeline and keep the APK small.

**Fonts.** Instrument Serif (regular and italic) for titles and hero headlines; Inter (400/500/600/700) for everything else. Both from `@expo-google-fonts/*` (OFL licence), loaded with `expo-font`'s `useFonts` in the root layout while the splash screen stays up, so they are bundled and work offline. A `Title` component renders a headline where words wrapped in `*...*` become italic ("Not sure *what* to *eat* next?"). Numbers use Inter with tabular figures. Alternative: Fraunces (heavier, less like the reference).

**Icons and rings.** `@expo/vector-icons` (Feather/Ionicons line icons) for tabs, meal slots and rows. `react-native-svg` for `ProgressRing` (two circles, stroke-dasharray), animated with Reanimated over 600 ms when the value changes. Meal slot icons are picked by slot name keywords (breakfast → coffee, lunch → sun, dinner → moon, snack → apple, workout → zap, other → circle).

**Tab bar.** A custom `tabBar` for Expo Router `Tabs`: a floating rounded bar above the bottom inset, three icons with labels, and an animated coral circle behind the active icon. Accessibility roles and labels ("Today", "Log", "Settings") are kept.

**Shared components (`src/ui/kit.tsx` and new files).** `Screen` (dark background, serif title, optional greeting row), `Card`, `HeroCard`, `Button` (primary green, secondary outline, danger, white pill for hero), `Chip`, `Field` (dark input), `ProgressBar`, `ProgressRing`, `EmptyState`, `SectionHeader` ("Title" + optional "See all >" action). Press feedback via `Pressable` style (opacity 0.85 and scale 0.98). Screens are moved onto these components; their logic is not touched.

**Haptics.** `expo-haptics` `notificationAsync(Success)` when an entry is saved (entry, confirm and Fix my day). Wrapped in a helper that swallows errors, so phones without a vibrator are fine.

**Name.** Migration v4: `ALTER TABLE profile ADD COLUMN name TEXT`. `Profile.name: string | null`, trimmed, max 30 characters, blank → null. Saved by onboarding (goal step) and Profile & targets. `wipeAllData` already deletes the profile row. Greeting text comes from a pure `greeting(date, name)` function with unit tests.

**Status bar and system UI.** Light status bar text on the dark background; `app.json` sets `userInterfaceStyle: "dark"` and a dark splash background so there is no white flash at launch.

**Staged rollout.** Build in stages that each produce a working APK: (1) tokens, fonts, components, tab bar; (2) Today; (3) Log, confirm, entry, Fix my day; (4) Settings, manage screens, phone model, About; (5) onboarding. Screens not yet converted still work because the old token names stay as aliases until stage 5 removes them.

## Risks / Trade-offs

- [Restyling every screen can break a flow by accident] → logic is not edited, only JSX structure and styles; existing tests must pass at each stage, and the phone checklist covers every main flow.
- [Custom fonts fail to load] → the app waits for fonts behind the splash screen with a short timeout and falls back to system fonts rather than hanging.
- [Dark colours hurt readability] → contrast test over the token table; numbers stay in the sans-serif font.
- [APK grows] → only the font weights used are bundled; icons come from one icon family; expected growth about 1 to 2 MB.
- [Animations feel slow on weaker phones] → short durations, Reanimated on the UI thread, and no animation on large lists.

## Migration Plan

Database migration v4 only adds a nullable column, so existing installs keep all data and upgrading is automatic. Rollback is reinstalling the previous APK only if the user first clears app data (Android does not allow installing an older version over a newer one); the old app would ignore the extra column anyway.
