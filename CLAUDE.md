# MacroMend

Android diet app (Expo + TypeScript). The full plan is in `docs/SPEC.md`; work is planned as OpenSpec changes in `openspec/changes/`, applied one at a time in the order listed in the spec.

The owner works only from an Android phone: Claude runs every command, and testing happens by installing the APK that the "Android APK" GitHub Actions workflow builds on every push to main.

@AGENTS.md

## Core rules (apply to every phase)

- AI only parses text into `{"items":[{"name","qty","unit","slot"}]}`. Calories and protein always come from the food table; only foods found nowhere get an AI estimate, always marked "estimated".
- Input can be English, Hinglish or a mix; app screens are English.
- Veg and non-veg both supported; diet type only filters suggestions, never what can be logged.
- Offline-first: all data in on-phone SQLite, no backend, no login.
- Phone model: Gemma 4 E2B via react-native-executorch, downloaded in-app, never bundled.
- Model names and provider settings are data, never hard-coded only.

## After every apply

After every /opsx:apply, before saying it's done: run `npx tsc --noEmit`, `npm test` and `npx expo-doctor`, and fix everything that fails. Commit and push, then give me a short report and a numbered checklist to test on my phone after installing the APK from GitHub Actions. Never archive; I do that.
