# Proposal

## Why

Cloud keys run out, networks drop and some users don't want their text leaving the phone. The spec's fallback (docs/SPEC.md, "AI provider chain") is an on-device model, Gemma 4 E2B via react-native-executorch, so text logging keeps working offline and privately on phones that can run it.

## What Changes

- Optional in-app download of Gemma 4 E2B (about 2.4–3 GB) with progress (a warning on mobile data), cancel, a free-storage check and a delete button. Not bundled in the APK.
- Device check: the download is offered only on phones with about 8 GB RAM or more; others see "phone model not supported" and keep cloud keys plus manual pick.
- The phone model joins the parsing chain after cloud providers: used when no cloud key is set, all cloud providers are out of quota for the day (cloud retried the next day), the phone is offline, or cloud requests time out.
- "Always use phone model" privacy switch in Settings: no text is sent to cloud providers.
- The confirm list shows which model understood the text.
- A built-in "Test phone model" screen runs 25–30 English/Hinglish sample sentences on the phone and shows how many it got right.
- The onboarding AI setup step offers the phone model download where supported.

## Capabilities

### New Capabilities
- `on-device-model`: device support check, download, storage, deletion, running the phone model, and its self-test.

### Modified Capabilities
- `ai-providers`: adds the phone model as the fallback after cloud providers, the daily switch-over and the phone-only privacy switch.
- `onboarding`: the AI setup step offers the phone model download on supported phones.

## Impact

- New dependencies: `react-native-executorch` (v0.11+) with peers `react-native-worklets` and `react-native-blob-util`, plus `expo-device` and `expo-file-system`; requires Expo SDK 55+ (project is on 58) and a native build (the CI APK already is one).
- APK size grows by the native runtime only; the model is downloaded at runtime.
- New module `src/ai/phoneModel.ts` implementing the existing `Parser` interface; chain changes in `src/ai/chain.ts`.
