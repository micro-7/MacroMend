# Tasks

## 1. Look and feel

- [x] 1.1 Create the final app icon (adaptive foreground/background and monochrome), splash image and colours; update `app.json`; verify `npx expo prebuild --platform android --no-install` succeeds and icons appear on the phone
- [x] 1.2 Add `app.config.ts` setting `android.versionCode` from the CI run number (default 1 locally) and version `1.0.0`; verify `npx expo config --type public` shows both values

## 2. About and data deletion

- [x] 2.1 Build Settings → About (name, version, build, privacy summary, data sources, licences list generated at build time, privacy policy link); verify on the phone
- [x] 2.2 Implement `wipeAllData()` (user tables, secure-store keys, model files, settings) and the confirm dialog; verify tests against the test database that only built-in foods remain and onboarding is required afterwards

## 3. Release pipeline

- [x] 3.1 Add `plugins/withReleaseSigning.js` (release signing from Gradle properties, debug fallback) and register it in the app config; verify the test APK workflow still builds a debug-signed APK
- [x] 3.2 Add a `workflow_dispatch` keystore-generation workflow and `.github/workflows/android-release.yml` (tags `v*`, decode secrets, `bundleRelease`, upload AAB); write `docs/release.md` with step-by-step phone-friendly instructions; verify a tag build produces `app-release.aab` once secrets are set

## 4. Store material

- [x] 4.1 Write `docs/privacy-policy.md` and enable GitHub Pages for it; verify the page URL opens on the phone
- [x] 4.2 Write `docs/play-store-listing.md` (title, short and full description, data-safety answers, content rating notes, screenshot list, feature graphic spec, closed-testing requirement); verify every data-safety answer matches the About privacy summary
- [x] 4.3 Before publishing: compare the values in `src/data/foods/indian.ts` (and the hand-typed rows in `src/data/foods/global.ts`) with IFCT 2017 / NIN and USDA FoodData Central, correct any value that differs by more than about 10%, and confirm in writing that IFCT's licence allows bundling its numbers (otherwise keep USDA-derived or self-calculated values); update `docs/food-data-sources.md` and bump `CATALOG_VERSION`; verify the checked rows, the licence decision and the catalog test pass are recorded in `docs/food-data-sources.md`

## 5. Test this phase

- [x] 5.1 Run `npx tsc --noEmit`, `npm test` and `npx expo-doctor`; verify all pass
- [x] 5.2 Push to main and verify the GitHub Actions APK build succeeds

Manual checks on your Android phone (install the new APK):
1. The home-screen icon and splash screen show the new MacroMend design; with themed icons on (Android 13+), the monochrome icon is used.
2. Settings → About shows version 1.0.0 and a build number; the privacy summary matches what you expect; Data sources lists USDA, Open Food Facts (ODbL) and the Indian table sources; the privacy policy link opens.
3. Install the next APK build over this one: it installs as an update (no uninstall needed) and your data is kept.
4. Settings → "Delete all my data" → Cancel: nothing changes. Do it again and confirm: onboarding starts, Settings → AI providers is empty, the phone model is gone, and the Log search still finds roti.
5. After you add the signing secrets and push a tag like `v1.0.0`, the "Android release" workflow produces an `.aab` you can download and upload to Play Console.
