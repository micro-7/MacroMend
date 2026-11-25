# Tasks

## 1. Runtime setup

- [ ] 1.1 Check react-native-executorch's docs and changelog for the release supporting Expo SDK 58 / React Native 0.88 and the Gemma 4 E2B model constant; install it and its peers (`react-native-worklets`, `react-native-blob-util`) plus `expo-device` and `expo-file-system` with `npx expo install`; verify `npx expo-doctor` passes and the CI APK still builds. If unsupported, stop and report before continuing
- [x] 1.2 Add `src/core/deviceSupport.ts` (RAM ≥ 7 GiB, free space ≥ model + 1 GB, Wi-Fi check) as pure functions over injected values; verify unit tests for 6 GB, 8 GB and low-storage cases

## 2. Download and model management

- [x] 2.1 Implement download state in `settings` (none, downloading, incomplete, ready) with progress, cancel (removes partial files), resume and size verification; verify unit tests of the state machine with a mocked downloader
- [x] 2.2 Implement `src/ai/phoneModel.ts` (lazy load, idle/background unload, 30 s timeout, shared prompt + schema); verify unit tests with a mocked executorch module for success, invalid output and load failure

## 3. Chain changes

- [x] 3.1 Update `src/ai/chain.ts` for phone-only mode, offline → phone, all-cloud-quota → phone until midnight, and cloud → phone → manual order; record which parser answered; verify unit tests for every ai-providers scenario in this change, and that phone-only mode never calls `fetch` for parsing or estimates

## 4. Screens

- [x] 4.1 Settings → Phone model: support status, download/cancel/resume/delete with progress and storage figures, "Always use phone model" switch, "Using phone model until tomorrow" status; verify on the phone
- [x] 4.2 "Test phone model" screen running the shared fixture sentences with score and failures; verify on the phone
- [x] 4.3 Show "Understood by: …" on the confirm list; add the phone model offer to the onboarding AI setup step on supported phones; verify onboarding tests still pass

## 5. Test this phase

- [x] 5.1 Run `npx tsc --noEmit`, `npm test` and `npx expo-doctor`; verify all pass
- [ ] 5.2 Push to main and verify the GitHub Actions APK build succeeds

Manual checks on your Android phone (install the new APK; you need about 4 GB free and Wi-Fi):
1. Settings → Phone model. On a phone with less than 8 GB RAM it should say "not supported" — stop here and tell me. Otherwise it shows the download size.
2. Turn Wi-Fi off and tap Download: it asks for Wi-Fi. Turn Wi-Fi on, tap Download: progress shows. Cancel it, then start again and let it finish (or turn Wi-Fi off midway and check Resume works).
3. Run "Test phone model". Note the score (aim for most correct, e.g. 24/28 or better) and send me the failed sentences.
4. Turn on airplane mode, type "do roti aur ek katori dal": the confirm list shows 2 roti and 1 katori dal and "Understood by: Phone model". Time how long it takes.
5. Airplane mode off. Turn on "Always use phone model" and log something: it still says Phone model. Turn it off: the next log says your cloud provider.
6. Delete the model: Settings shows the freed space; with airplane mode on, typing text now falls back to manual pick.
7. Use the app normally for a few minutes after a phone-model log, switch to another app and back: MacroMend should not crash.
