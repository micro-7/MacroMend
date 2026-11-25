# Releasing MacroMend to Google Play

Everything here can be done from a phone browser (GitHub mobile site, "Desktop site" mode helps) and the Play Console. Day-to-day testing does not change: every push to `main` still builds the debug-signed test APK.

## 0. Before anything else

- Pay the one-time **$25 Google Play developer fee** and create a Play Console account (https://play.google.com/console).
- Personal developer accounts created recently must run a **closed test with at least 12 testers for 14 days** before production access. Recruit testers early (their Google account emails go into a closed-testing track).
- Finish the pre-publish food-data check (`docs/food-data-sources.md`, section "Pre-release check") before inviting anyone.

## 0.5 Turn on the privacy policy web page (once)

Play needs a public web address for the privacy policy. Repository → **Settings → Pages** → Source **Deploy from a branch** → Branch **main**, folder **/docs** → **Save**. After a minute, https://micro-7.github.io/MacroMend/privacy-policy should open. (Only the privacy policy is published; `docs/_config.yml` keeps the other docs off the site.)

## 1. Create the upload key (once)

1. GitHub → repository → **Actions** → **Create upload keystore** → **Run workflow**.
2. When it finishes, open the run and download the artifact **macromend-upload-keystore** (a zip). It contains `upload-keystore.jks` and `secrets.txt`.
3. Keep `upload-keystore.jks` somewhere safe (cloud drive, password manager). If you ever lose it, Play can reset the upload key, so it is not a disaster, but keep a copy.

## 2. Save the four secrets (once)

Repository → **Settings → Secrets and variables → Actions → New repository secret**. Create these four, copying each value from `secrets.txt`:

| Secret name | Value in secrets.txt |
| --- | --- |
| `ANDROID_UPLOAD_KEYSTORE_B64` | the long line after `ANDROID_UPLOAD_KEYSTORE_B64=` |
| `ANDROID_UPLOAD_STORE_PASSWORD` | the value after `ANDROID_UPLOAD_STORE_PASSWORD=` |
| `ANDROID_UPLOAD_KEY_ALIAS` | `upload` |
| `ANDROID_UPLOAD_KEY_PASSWORD` | the value after `ANDROID_UPLOAD_KEY_PASSWORD=` |

Then **delete the artifact** (run page → artifact → delete) and delete `secrets.txt` from your phone. The artifact also expires after 1 day.

## 3. Build a release

1. Make sure the latest push to `main` built a good test APK and you tested it.
2. Create a tag: repository → **Releases → Draft a new release → Choose a tag → type `v1.0.0` → Create new tag → Publish release**. (Or run the **Android release** workflow by hand from the Actions tab.)
3. The **Android release** workflow signs and builds `app-release.aab`. Download the artifact **macromend-aab** from the run.
4. Each build's `versionCode` is the workflow run number, so every release is higher than the last. To ship an update, bump `version` in `app.json` if the user-visible version changes, push, and tag again.

## 4. Upload to Play Console

1. Play Console → **Create app** (name MacroMend, language English, App, Free).
2. Fill the store listing from `docs/play-store-listing.md`; privacy policy URL: https://micro-7.github.io/MacroMend/privacy-policy (open it in your browser first to check it loads).
3. **Testing → Closed testing → Create release**, accept **Play App Signing**, upload `app-release.aab`, add the testers' emails, and start the 14-day clock.
4. After the closed test requirement is met, apply for production access and promote the release.

## 5. If something goes wrong

- *"A signing secret is missing"* in the workflow: redo step 2 and check the names are spelled exactly.
- *Play says the upload key is wrong*: you uploaded an AAB signed with a different key; use the one from step 1 consistently, or use Play Console → App integrity → "Request upload key reset".
- *The build fails but the test APK builds*: open the failed step in the run; tell Claude the error text.
