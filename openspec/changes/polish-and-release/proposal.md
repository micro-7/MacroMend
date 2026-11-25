# Proposal

## Why

With the MVP features in place, MacroMend needs to look like a finished app and be publishable on the Play Store (docs/SPEC.md, change order step 8). The Play Store also requires a privacy policy, data-safety answers and a properly signed release, and the data sources need visible attribution.

## What Changes

- Final app icon (adaptive icon with monochrome layer), splash screen and app name "MacroMend".
- Settings → About: version, what data leaves the phone and when, data source attribution (USDA FoodData Central, Open Food Facts under ODbL, Indian food table sources), open-source licences, and a link to the privacy policy.
- Settings → "Delete all my data": wipes profile, logs, staples, saved foods, provider keys and the phone model, then restarts onboarding.
- Release signing with a private upload key kept in GitHub Actions secrets, and a workflow that builds a signed Android App Bundle (AAB) when a version tag is pushed. The debug-signed test APK workflow stays as is.
- Version name/code scheme for releases.
- Pre-release check of the bundled food values: verify the Indian and hand-typed rows against IFCT 2017 / NIN and USDA, and confirm the IFCT licence before anything is published.
- Play Store listing material: short and full description, screenshots, feature graphic, privacy policy page, data-safety answers, content rating notes.

## Capabilities

### New Capabilities
- `app-about`: the About screen (version, privacy summary, attributions, licences, privacy policy link) and deleting all local data.

### Modified Capabilities
None.

## Impact

- New assets in `assets/`, `app.json` icon/splash/version settings.
- New workflow `.github/workflows/android-release.yml`; GitHub secrets for the upload keystore (owner creates them).
- New docs: `docs/privacy-policy.md`, `docs/play-store-listing.md`, `docs/release.md`.
- One-time $25 Google Play developer fee, paid by the owner.
