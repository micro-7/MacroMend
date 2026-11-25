# Design

## Context

All MVP changes are in place. The test APK workflow (`.github/workflows/android-apk.yml`) builds a debug-signed release APK on every push to main. Nothing is signed for the Play Store yet. Requirements are in `specs/`.

## Goals / Non-Goals

**Goals:**
- A signed AAB the owner can upload to Play Console without a computer.
- Keep the debug-signed test APK flow unchanged for day-to-day testing.

**Non-Goals:**
- iOS release, EAS Submit automation to Play, in-app updates, analytics or crash reporting (would change the privacy story).

## Decisions

**Signing via GitHub secrets, not EAS.** The owner creates an upload keystore once (a task gives exact commands to run in a GitHub Actions `workflow_dispatch` job that generates it and prints nothing secret; the owner downloads it as an artifact, stores it safely, deletes the artifact, then saves it base64-encoded as `ANDROID_UPLOAD_KEYSTORE_B64` with `ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD`). A small config plugin (`plugins/withReleaseSigning.js`) adds a release `signingConfig` read from Gradle properties when present, falling back to the debug key so the test APK workflow keeps working. Alternative: EAS Build with managed credentials; rejected to avoid an Expo account and build-minute limits, and because the pipeline already uses prebuild + Gradle.

**Release workflow.** `.github/workflows/android-release.yml` runs on tags `v*`: prebuild, decode keystore, `./gradlew bundleRelease`, upload `app-release.aab` as an artifact. Play App Signing holds the real app signing key; the upload key can be reset through Play if lost.

**Versioning.** `version` in `app.json` is the human version (`1.0.0`); `android.versionCode` comes from `github.run_number` in CI via an env-aware `app.config.ts`, so every build installs over the previous one.

**Delete all data.** One function `wipeAllData()` that drops and recreates user tables in a transaction, clears secure-store keys by listing provider ids first, deletes the model directory, then resets navigation to onboarding. Built-in foods are re-seeded by the existing seeding step.

**Privacy policy hosting.** `docs/privacy-policy.md` published with GitHub Pages from the repo (Play requires a public URL); the About screen links to that URL.

## Risks / Trade-offs

- [Losing the upload keystore blocks updates] → Play App Signing allows an upload key reset; `docs/release.md` explains backing it up.
- [New personal Play developer accounts must run a closed test with at least 12 testers for 14 days before production] → documented in `docs/release.md`; the owner plans testers early.
- [Indian and other hand-typed food values are unverified and the IFCT/NIN licence is unconfirmed] → task 4.3 checks them against IFCT/NIN and USDA and settles the licence before anything is published; until then the app is for the owner's own testing.
- [Data-safety answers must match behaviour] → answers in `docs/play-store-listing.md` are derived from the About screen's privacy summary.
