# MacroMend

Android diet app (Expo + TypeScript). The full plan is in `docs/SPEC.md`; work is planned as OpenSpec changes in `openspec/changes/`, applied one at a time in the order listed in the spec.

The owner works only from an Android phone: Claude runs every command, and testing happens by installing the APK that the "Android APK" GitHub Actions workflow builds on every push to main.

@AGENTS.md

**Start every new session by reading `docs/status.md`** (where the project stands and what the owner still has to do), then `docs/future.md`. Update `docs/status.md` at the end of each piece of work.

## Core rules (apply to every phase)

- AI only parses text into `{"items":[{"name","qty","unit","slot"}]}`. Calories and protein always come from the food table; only foods found nowhere get an AI estimate, always marked "estimated".
- Input can be English, Hinglish or a mix; app screens are English.
- Veg and non-veg both supported; diet type only filters suggestions, never what can be logged.
- Offline-first: all data in on-phone SQLite, no backend, no login.
- Phone model: Gemma 4 E2B via react-native-executorch, downloaded in-app, never bundled.
- Model names and provider settings are data, never hard-coded only.

## After every apply

After every /opsx:apply, before saying it's done: run `npx tsc --noEmit`, `npm run lint`, `npm test` and `npx expo-doctor`, and fix everything that fails. Commit and push, then give me a short report and a numbered checklist to test on my phone after installing the APK from GitHub Actions. Never archive; I do that.

## Commits

Commit as the owner: `git config user.name "Mihir Tandon"` and `git config user.email "85353517+micro-7@users.noreply.github.com"`. Do not add `Co-Authored-By`, `Claude-Session` or any other Claude attribution to commit messages or pull requests.

## Branches

Push straight to `main`; do not create `claude/...` or other branches or pull requests unless asked. Every push to `main` builds the test APK.
