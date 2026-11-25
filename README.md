# MacroMend

A calorie and protein tracker for Android, built for how people eat in India. Type what you ate in English, Hinglish or a mix ("do roti aur ek katori dal"), check what the app understood, and log it. Calories and protein always come from the app's own food table, never from an AI guess.

Everything is stored on your phone. There is no account, no login and no MacroMend server.

> **Status:** version 1.0.0, Android only. Not on the Play Store yet. Test builds are produced by GitHub Actions on every push to `main` (see [Install the app on a phone](#install-the-app-on-a-phone)).

## Features

- **Daily targets** for calories and protein, calculated from goal (cut, maintain or bulk), body details and activity, or typed in by hand.
- **Diet types:** vegetarian, eggetarian, non-vegetarian and vegan. The diet type only filters suggestions; anything can still be logged.
- **Log by search or by typing a sentence.** Typed text is turned into foods and amounts by an AI provider you add yourself (Google Gemini, Groq, OpenRouter or any OpenAI-compatible service), or by an AI model that runs on the phone. You always see and can change the result before it is saved.
- **Household measures:** piece, katori, bowl, glass, cup, scoop, tbsp, tsp, grams and more, with Hindi number words such as "do", "aadha", "dedh" and "sawa".
- **Food table of 406 foods:** 155 Indian foods, 179 rows from USDA FoodData Central and 72 other common foods. Foods not in the table can be searched online (USDA FoodData Central and Open Food Facts) or estimated by AI, always marked "est." until you check them.
- **Today screen:** rings for calories left, protein left and meals logged, and your meals as cards.
- **Fix my day:** builds the rest of the day from your usual foods to fit the calories and protein that are left.
- **Phone model (optional):** Gemma 4 E2B, downloaded in the app (about 3 GB) and run on the phone, so typed logging works with no internet and no key. Needs a phone with about 8 GB of RAM and about 4 GB free space.
- **Works offline** for everything except AI providers, online food search and the model download.
- **Delete all my data** in one tap (Settings → About).

## Privacy

- All data you enter stays on the phone, in the app's private database.
- Text you type to log food is sent only to the AI providers **you** add, with your own key. Nothing is sent when "Always use phone model" is on.
- Online food search sends only the food name, to USDA FoodData Central and Open Food Facts. It can be switched off in Settings → Food lookup.
- API keys are kept in the phone's secure storage and sent only to their own provider.
- No analytics, no ads, no crash reporting.

Full policy: <https://micro-7.github.io/MacroMend/privacy-policy>

## Install the app on a phone

The "Android APK" workflow builds a test APK on every push to `main` that changes the app (pushes that only change docs or OpenSpec files do not build).

1. Sign in to GitHub (artifacts can only be downloaded when signed in).
2. Open the repository's **Actions** tab → **Android APK** → the newest run with a green tick.
3. Under **Artifacts**, download **macromend-apk** (a zip, kept for 30 days).
4. Unzip it on the phone and tap the `.apk` file. Android asks to allow installs from that app (your browser or file manager); allow it.
5. To update later, install a newer APK over the old one. Your data is kept.

Notes:

- The APK is built for 64-bit ARM phones (`arm64-v8a`), which covers almost all Android phones from the last several years. The minimum Android version comes from React Native's defaults (Android 7.0, API 24).
- Test APKs are signed with the standard Android debug key. Do not share them as an official release; see `docs/release.md` for signed builds.
- Android may show a warning for apps installed from outside the Play Store. That is expected.

## First use

1. Onboarding asks for your name (optional), goal, targets, diet type, meal slots and usual foods.
2. To log by typing, add an AI provider in Settings → AI providers. Free keys: [Google AI Studio](https://aistudio.google.com/api-keys), [Groq](https://console.groq.com/keys), [OpenRouter](https://openrouter.ai/keys). You can skip this; searching and picking foods always works.
3. Optional: add a free USDA key in Settings → Food lookup ([sign up](https://fdc.nal.usda.gov/api-key-signup)). Without one, the app uses USDA's shared demo key, which runs out quickly.
4. Optional: download the phone model in Settings → Phone model (Wi-Fi recommended; on mobile data the app warns first).

## Run the code on your computer

### Requirements

- **Git**
- **Node.js 22** (the version CI uses) and npm
- To build the Android app yourself: **JDK 17** and the **Android SDK** (the easiest way is to install [Android Studio](https://developer.android.com/studio)), plus a phone with USB debugging turned on or an Android emulator

You do not need any of the Android tools to run the tests or to get an APK: GitHub Actions builds it for you.

### Get the code and install packages

```bash
git clone https://github.com/micro-7/MacroMend.git
cd MacroMend
npm install
```

`npm install` also downloads the native libraries for the phone model (`react-native-executorch`). To download only what an Android phone needs (smaller and faster), set these first:

```bash
# macOS / Linux
export RNET_TARGET=android-arm64-v8a
export RNET_NO_X86_64=1
# Windows PowerShell
$env:RNET_TARGET="android-arm64-v8a"; $env:RNET_NO_X86_64="1"
```

Leave them unset if you want to run the app on an x86_64 emulator.

### Check the code

```bash
npx tsc --noEmit   # type check
npm test           # unit and screen tests (Jest)
npx expo-doctor    # Expo dependency and config checks
```

### Run on a phone or emulator (development build)

```bash
npx expo run:android
```

This generates the `android/` folder, builds a debug app, installs it on the connected phone or emulator and starts the Metro dev server. Code changes then reload on the phone. The app uses native modules (the phone model, SQLite, secure storage), so it does **not** run in the Expo Go app.

### Build a release APK yourself

This is what the GitHub workflow does:

```bash
npx expo prebuild --platform android --clean --no-install
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a      # Windows: gradlew.bat
```

The APK is written to `android/app/build/outputs/apk/release/`. Install it with `adb install <file>.apk`, or copy it to the phone and open it.

The `android/` folder is generated from `app.json`, `app.config.ts` and `plugins/`; it is not committed. Change those files, not `android/`.

### Other scripts

| Command | What it does |
| --- | --- |
| `npm run licenses` | Rewrites `src/data/licenses.json` (the licence list shown in Settings → About) from `node_modules`. CI runs it before each build. |
| `EVAL_PROVIDER=groq EVAL_API_KEY=... npm run eval:parse` | Runs the 30 test sentences against a real AI provider and prints the score. Providers: `gemini`, `groq`, `openrouter`, `custom` (with `EVAL_BASE_URL` and `EVAL_MODEL`). |
| `python3 scripts/make-icons.py` | Regenerates the app icons and splash image in `assets/` (needs Pillow). |

## Project structure

```
src/
  app/        Screens (Expo Router: every file is a route; _layout.tsx files are navigators)
  ui/         Shared components, theme (colours, fonts, spacing) and forms
  core/       Pure logic: targets, portions, matching, day summary, Fix my day
  db/         On-phone SQLite: migrations, foods, logs, profile, providers, settings
  ai/         Text parsing: prompt, reply checking, cloud providers, phone model, fallback chain
  lookup/     Online food search (USDA, Open Food Facts) and AI estimates
  phone/      Phone model download, device checks and runtime
  onboarding/ Onboarding draft and profile building
  data/       The bundled food table and licence list
plugins/      Expo config plugin for release signing
scripts/      Licence list, parsing evaluation, icon generation
openspec/     Specs (what the app must do) and the history of every change
docs/         Plan, project status, release steps, privacy policy, store listing
```

Tech: Expo SDK 58, React Native 0.88, React 19, TypeScript 6, Expo Router, expo-sqlite, react-native-executorch, Jest.

## How changes are made

Every feature is planned and built as an [OpenSpec](https://github.com/Fission-AI/OpenSpec) change in `openspec/changes/` (proposal, specs, design and tasks, each ending with a phone checklist), then archived into `openspec/specs/`. Read `docs/status.md` for where the project stands and `docs/future.md` for ideas not started yet.

## GitHub workflows

| Workflow | When it runs | What it does |
| --- | --- | --- |
| Android APK (`android-apk.yml`) | Every push to `main` that changes the app, or by hand | Type check, tests, then a debug-signed release APK (artifact `macromend-apk`) |
| Create upload keystore (`android-keystore.yml`) | By hand, once | Creates the private signing key and its four secret values as a 1-day artifact |
| Android release (`android-release.yml`) | Tags `v*`, or by hand | Signed Android App Bundle (`.aab`) for Google Play; needs the signing secrets |

The keystore and release workflows have not been run yet. Steps: `docs/release.md`.

## Documentation

| File | Contents |
| --- | --- |
| `docs/status.md` | Where the project stands and what is still to do |
| `docs/future.md` | Ideas that are not started |
| `docs/SPEC.md` | The original plan |
| `docs/food-data-sources.md` | Where every food value comes from and how it was checked |
| `docs/release.md` | Signing key, signed builds and Play Store steps |
| `docs/play-store-listing.md` | Store text and data-safety answers |
| `docs/privacy-policy.md` | Privacy policy (published with GitHub Pages) |

## Data sources

- **USDA FoodData Central:** public domain (CC0 1.0). Bundled Foundation Foods rows and online search.
- **Open Food Facts:** online search only; data under the Open Database Licence (ODbL).
- **Indian and other hand-written values:** compiled for this app and checked against USDA reference values. No values are copied from IFCT 2017. See `docs/food-data-sources.md`.

## Licence

No licence has been chosen yet, so all rights are reserved by the author. Open-source libraries used by the app keep their own licences (listed in the app under Settings → About).
