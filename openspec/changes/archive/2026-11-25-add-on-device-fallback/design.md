# Design

## Context

Builds on the `Parser` interface, prompt with few-shot examples, zod schema, provider chain, skip states and the sample-sentence fixtures from `add-cloud-parsing`, and the estimate flow from `add-online-food-lookup` (which goes through the same chain). The project is on Expo SDK 58 with the CI building a native release APK. Requirements are in `specs/`.

## Goals / Non-Goals

**Goals:**
- The phone model is just another `Parser` in the chain.
- Never crash or freeze the app on load failure or low memory; fall back to manual pick.

**Non-Goals:**
- Photo or voice logging (the model is multimodal, but that is later), other on-device models, iOS.

## Decisions

**Runtime: react-native-executorch v0.11+.** Use the Gemma 4 E2B model constant shipped in the library's model registry (Software Mansion's `react-native-executorch-gemma-4` export on Hugging Face), Android XNNPACK variant by default; try Vulkan only if XNNPACK is too slow on the test phone. Peer deps `react-native-worklets` and `react-native-blob-util` installed with `npx expo install`. Compatibility with SDK 58 / RN 0.88 is checked first (task 1.1) before building anything else.

**`src/ai/phoneModel.ts`.** Implements `Parser`. Loads the model lazily on first parse, keeps it while the app is in the foreground, and unloads after 5 minutes idle or when the app goes to the background. Uses the shared prompt plus a stricter "reply with JSON only" reminder and a 30 s timeout (on-device generation is slower than cloud). Output goes through the same zod schema.

**Chain order (`src/ai/chain.ts`).**
1. If "Always use phone model" → phone model only (or manual pick if not downloaded).
2. If offline → phone model.
3. If every enabled cloud provider is skipped for quota until midnight → phone model, and record `phone_until_midnight` so Settings can show it.
4. Otherwise cloud providers in order, then phone model, then manual pick.
Cloud retries the next day happen automatically because quota skips expire at local midnight.

**Device and download checks.** `expo-device` `totalMemory ≥ 7 GiB` (8 GB phones report roughly 7.2–7.6 GiB). `expo-file-system` free disk ≥ model size + 1 GB. `expo-network` type: on mobile data the user is warned and may choose to download anyway; with no connection it does not start. Download state (`none|downloading|incomplete|ready`) and bytes are stored in the `settings` table; the library's download API or `react-native-blob-util` provides progress and resume; files are verified by size before `ready`.

**Self-test screen.** Settings → Phone model → "Test phone model" runs the shared fixture sentences sequentially, compares items by matched food id, quantity and unit, and shows the score and failures. This is how the spec's "20–30 real mixed sentences" check is done on the owner's phone.

## Risks / Trade-offs

- [react-native-executorch may not support SDK 58 / RN 0.88 yet] → task 1.1 verifies first; if unsupported, stop and report options (pin a supported version, wait, or patch) rather than downgrading the SDK silently.
- [Memory pressure kills the app on 8 GB phones] → lazy load, unload on background/idle, catch load errors and fall back to manual pick with a message.
- [Small model is weaker at Hinglish] → few-shot examples, self-test score visible to the user, confirm-before-save always.
- [3 GB download fails on flaky Wi-Fi] → resume support and size verification.
