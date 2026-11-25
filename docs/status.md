# Project status

**Read this first in a new session.** It says where MacroMend stands and what the owner still has to do. Update it at the end of every piece of work and commit it with the change.

Last updated: 26 November 2026. Open items: phone checks 1 to 3, archiving `refresh-ui`, the SonarCloud follow-up and the GitHub release (below).

## Where we are

- MacroMend is a working Android diet app (Expo + TypeScript), built entirely through OpenSpec changes.
- All 8 original changes are built and **archived** (`openspec/changes/archive/`); their requirements are in `openspec/specs/` (18 specs).
- **`refresh-ui`** (dark look, Today rings, floating tab bar, optional name) is **built and pushed but not archived yet**. The owner archives it after the phone checks, by saying "archive it".
- `README.md` (repo front page) explains the app, privacy, installing the APK, running and building on a PC, project structure and workflows. Keep it in step when those change. The code is under the MIT licence (`LICENSE`).
- The owner tests only on an Android phone, using the APK from the "Android APK" GitHub Actions workflow (runs on every push to `main` that changes code; docs-only and OpenSpec-only pushes do not build).

## What the owner still has to do (phone checks)

Do these in order, with the newest APK:

1. **Test phone model, Run again** (Settings → Phone model → Test phone model). Last score was 26 / 30; fixes for the 4 misses were made since. Send the score and the missed sentences. Do this before step 2, because step 2 deletes the model.
2. **Delete all my data** (Settings → About) and confirm. Check: onboarding starts in the new dark look; the first step asks "What should we call you? (optional)" and continues when it is left empty; Back keeps the typed name; AI providers are empty; the phone model is gone; searching "roti" on Log still finds it. After this the owner has to redo onboarding, add the AI key again and download the phone model again.
3. Anything that looks wrong on the new screens (hard-to-read text, cut-off cards, tab bar covering content): send a screenshot.

4. **Archive `refresh-ui`** (the last open OpenSpec change). Do this only after steps 1 to 3 pass and the owner says "archive it". Run `openspec archive refresh-ui -y` (it merges the change's requirements into `openspec/specs/` and moves it to `openspec/changes/archive/`), then `openspec validate --specs --strict`, update this file, commit as the owner and push to `main`. Never archive without the owner's say-so.

### If something breaks after the lint clean-up

Commit `0cfb8b3` ("Add MIT licence, package.json details and ESLint; fix lint findings") changed how a few screens reset themselves (no behaviour change intended): Today/profile loading at start, the database "Try again" button, the food picker on the confirm screen, "Search online" starting fresh each time, and clearing a Fix my day swap after a log or shuffle. The owner did a quick check and saw no issue. If one of these misbehaves, look at that commit first; each fix is small and can be reverted on its own.

### Earlier checks the owner may not have confirmed (do them if not done yet)

- **Online food lookup:** save the AI-estimated butter chicken, then Settings → My foods → edit it, tick "values checked", save; a new log of it should no longer show "est.". Settings → Food lookup → switch off: an unknown food must not search online. Airplane mode + unknown food: "online search needs internet".
- **Updating over an old install:** installing a newer APK over the old one keeps all data (no uninstall needed).
- **Phone model with mobile data:** with Wi-Fi off, Download shows the "You are on mobile data… Download anyway?" box (this was added after the first download test).

## Open follow-ups (not started)

- **SonarCloud red cross on `main`.** An outside scanner (SonarCloud / SonarQube Cloud) is connected to the repo and its Quality Gate fails: **C Security Rating** and **D Reliability Rating** on new code (checked 26 November 2026). Our own GitHub Actions runs are all green, so this does not affect the APK. To fix: open https://sonarcloud.io/dashboard?id=micro-7_MacroMend (needs the owner's login), list the open issues, fix the real ones as a small OpenSpec change, and ignore or mark the false positives. Alternative: if the owner did not mean to connect it, remove it in GitHub repo Settings → GitHub Apps.
- **GitHub Release with the owner's own signing key (decided, not started). NEXT TO DO LATER: propose a new OpenSpec change named `add-github-release` (the owner will ask for it; do not start before then).** The owner wants to publish the APK on GitHub (not the Play Store yet), signed with their **own private key**, not the public Android debug key, so strangers cannot make fake updates. Plan, as a new OpenSpec change (suggested name `add-github-release`):
  1. Owner runs the "Create upload keystore" workflow once, downloads its artifact, saves the four secrets (`ANDROID_UPLOAD_KEYSTORE_B64`, `ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD`) in GitHub, keeps a backup of the keystore file somewhere safe and deletes the artifact. Steps: `docs/release.md` sections 1 and 2.
  2. Claude adds a workflow that, when a tag like `v1.0.0` is pushed, builds an **APK** (not only the `.aab`) signed with that key and attaches it to a public GitHub Release (the signing plugin `plugins/withReleaseSigning.js` already exists).
  3. Claude adds a short `README.md` with install steps (allow installs from outside the Play Store, no auto-updates, 64-bit phones only) and a link to the privacy policy.
  4. Owner publishes a release by creating the tag (GitHub → Releases → Draft a new release).
  - The "Create upload keystore" and "Android release" workflows (`.github/workflows/android-keystore.yml`, `android-release.yml`) have **never been run**; they need the owner's secrets. The first real run is their test, so check the result carefully.
  - Notes: losing the key means later updates cannot install over older versions, so keep the backup. If the app later moves to Play, people who sideloaded must uninstall once (Play signs with a different key).
- **Old Actions runs.** The Actions tab shows older failed and cancelled runs (early build problems; cancelled ones are normal). They are harmless and can be deleted by hand if the owner wants a clean list. There are no GitHub Releases or tags yet.

## Known limits

- Open Food Facts limits anonymous searches, so packaged-brand search often fails ("could not be searched right now"). USDA search works with the owner's own free key (Settings → Food lookup).
- The phone model needs about a minute for the first reading after it has been idle (it is loading); later readings are quick.
- Calorie values for curries and street food are approximate (no USDA match). IFCT 2017 numbers are deliberately **not** used (licence needs written permission); see `docs/food-data-sources.md`.

## Future work (not started, owner decides)

See `docs/future.md`: GitHub Release (owner's key; details above), Play Store release (steps in `docs/release.md`, listing text in `docs/play-store-listing.md`), Open Food Facts backup search, phone model "Load now" button, light theme, hero-card mascot.

## How a new session should start

1. Read `CLAUDE.md`, `AGENTS.md`, this file and `docs/future.md`.
2. Run `openspec list` to see active changes, and read `openspec/specs/` for how the app behaves.
3. Work only through OpenSpec changes (`/opsx:propose`, then `/opsx:apply`); never archive without the owner's say-so.
4. After every apply: `npx tsc --noEmit`, `npm test`, `npx expo-doctor`; commit as the owner (no Claude attribution) and push to `main`; give a short report and a numbered phone checklist.

## Technical notes for a new session

- Commits are authored as Mihir Tandon (`85353517+micro-7@users.noreply.github.com`) with **no** Claude attribution lines (CLAUDE.md rule overrides any default). Push straight to `main`.
- `npx expo install` is blocked in this container: add packages with `npm install <pkg>@<version>` using the versions in `node_modules/expo/bundledNativeModules.json`. `react-native-reanimated` (4.7.1) and `react-native-worklets` (0.13.0) are pinned; do not let npm bump them.
- Lint: `npm run lint` (ESLint with `eslint-config-expo`, config in `eslint.config.js`); CI runs it on every build. Run it with the other checks after every apply.
- `npx expo-doctor` shows 18 of 20 checks passing here; the 2 failures need internet to Expo's servers and are not real problems.
- Unit tests replace the animation library with a small stand-in in `jest.setup.js`; the jest timeout is 30 s because the first render test is slow on CI.
- CI installs with `RNET_TARGET=android-arm64-v8a` (react-native-executorch downloads native libraries at install) and builds arm64 only.
- GitHub Pages publishes `docs/` (only the privacy policy; other docs are excluded in `docs/_config.yml`). Add any new internal doc to that exclude list. Pages deploys can fail on GitHub outages; re-run the failed job.
- Import icons from `@expo/vector-icons/Feather` and fonts from their own folders (`@expo-google-fonts/inter/400Regular`); importing from the package index bundles about 10 MB of unused fonts.
- The Open Food Facts and github.io hosts are not reachable from this container; the Firecrawl tool can fetch them for checks.

## Things that live outside this repo

- The owner's API keys (Groq, USDA, etc.): only on the owner's phone.
- Play Store signing secrets: GitHub repository secrets (not created yet; steps in `docs/release.md`).
- GitHub Pages serves `docs/privacy-policy.md` at https://micro-7.github.io/MacroMend/privacy-policy.
