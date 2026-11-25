# Tasks

## 1. Quantity words and matching

- [x] 1.1 Implement `src/core/quantityWords.ts` (English and Hindi/Hinglish number words, fractions, sawa/saadhe, unit spelling normalization with default-unit fallback); verify unit tests for every portion-conversion scenario and each listed word
- [x] 1.2 Implement `src/core/match.ts` (exact → variants → fuzzy with thresholds, ties by shortest name, alternatives); verify unit tests: dahi→curd, rotis→roti, panner→paneer (fuzzy), pizza→null, dal vs dal makhani

## 2. Providers

- [x] 2.1 Add migration v2 with the `providers` table and `src/db/providers.ts` (CRUD, order, enable, skip states); install `expo-secure-store` and `expo-network` with `npx expo install`; verify migration tests (v1→v2 keeps data) and provider CRUD tests pass
- [x] 2.2 Implement `src/ai/presets.ts`, `src/ai/prompt.ts` (system text, slot ids, six few-shot examples) and `src/ai/schema.ts` (zod, extra fields stripped, JSON extraction from plain text); verify unit tests for valid, invalid and nutrition-bearing replies
- [x] 2.3 Implement `src/ai/openaiCompat.ts` with timeout and error mapping, and `src/ai/chain.ts` with ordered fallback and skip states; verify unit tests with mocked `fetch` for 429 → next, quota → skipped until midnight, 401 → auth, 8 s timeout, invalid JSON, offline
- [x] 2.4 Add `src/ai/__fixtures__/sentences.ts` (25–30 English/Hinglish/mixed sentences with expected items) and an `eval:parse` npm script that runs them against a provider from env vars and prints accuracy; verify the script runs with a recorded-reply mock in tests

## 3. Screens

- [x] 3.1 Settings → AI providers: list with status (ok, rate limited, out of quota today, key rejected), add preset/custom, masked key, editable model, Test, reorder, enable/disable, delete (removes key), privacy notes; verify on the phone
- [x] 3.2 Onboarding: optional AI setup step after usual foods, reusing the add-provider form, with "Skip, I'll log manually"; verify the onboarding tests still pass and on the phone
- [x] 3.3 Log tab: "Type what you ate" box → chain → confirm list (matched food, fuzzy highlight, alternatives, qty/unit/slot edit, remove, Not found with pick-food, kcal/protein from the table) → Log saves via `logFood` with raw text; fallback messages open manual search with the text kept; verify on the phone

## 4. Test this phase

- [x] 4.1 Run `npx tsc --noEmit`, `npm test` and `npx expo-doctor`; verify all pass
- [x] 4.2 Push to main and verify the GitHub Actions APK build succeeds

Manual checks on your Android phone (install the new APK; get a free key from Google AI Studio or console.groq.com first):
1. Settings → AI providers → add Groq (or Gemini), paste the key, tap Test: it says OK. Reopen it: the key is masked except the last 4 characters, and the privacy note is shown.
2. Add a second provider with a deliberately wrong key, move it to the top with the ↑ arrow, open it and tap Test: "The key was rejected". Leave it on top.
3. Log tab: type "office mein 2 samosa kha liye" and tap "Log it with AI". The confirm list shows 2 samosa (the bad key was skipped automatically). Change it to 1, tap Log; Today shows 1 samosa.
4. Type "had 2 roti and dal": 2 roti and 1 dal appear. Type "breakfast mein do anda aur ek katori dahi": 2 eggs and 1 katori curd, both in Breakfast.
5. Type "2 panner paratha" (typo): paneer paratha is matched and highlighted. Type a made-up food: it shows Not found with a pick-food button.
6. Turn on airplane mode, type something: the app says you're offline and opens manual search with your text kept.
7. Delete all providers and type something: it says no AI is set up and offers Settings.
8. Clear app data and go through onboarding: the last step is AI setup; "Skip, I'll log manually" finishes onboarding.
