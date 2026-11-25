# Design

## Context

Builds on the food table and `findFoodByExactName` (`setup-app-shell`), onboarding and Settings (`add-onboarding`), and `logFood`, `toGrams`, `defaultSlotFor` (`add-manual-logging`). The provider list here becomes the first part of the chain that `add-on-device-fallback` extends. Requirements are in `specs/`.

## Goals / Non-Goals

**Goals:**
- One provider interface that cloud and (later) on-device models both implement.
- Parsing, matching and quantity words fully unit-tested with mocked network.
- A reusable set of 25–30 English/Hinglish test sentences.

**Non-Goals:**
- On-device model (`add-on-device-fallback`), online food lookup and AI estimates (`add-online-food-lookup`), voice or photo input.

## Decisions

**Provider interface.** `src/ai/types.ts`: `interface Parser { id; parse(text, ctx): Promise<ParseResult> }` where `ParseResult` is `{ok: true, items}` or `{ok: false, error: 'rate_limit'|'quota'|'auth'|'model'|'invalid_reply'|'network'|'timeout', retryAfterS?}`. `src/ai/chain.ts` walks the list in order and records skip states. The phone model later implements the same interface.

**One OpenAI-compatible client.** `src/ai/openaiCompat.ts` POSTs `{baseUrl}/chat/completions` with `Authorization: Bearer <key>`, `model`, `temperature: 0`, `messages`, and `response_format: {type: "json_object"}` (retried once without it if the provider rejects the field). `AbortController` enforces the 8 s timeout. Presets in `src/ai/presets.ts`:
- Gemini: `https://generativelanguage.googleapis.com/v1beta/openai`, default `gemini-3.5-flash-lite` (the current Flash-Lite in Google's model list on 2026-11-25).
- Groq: `https://api.groq.com/openai/v1`, default `openai/gpt-oss-20b`.
- OpenRouter: `https://openrouter.ai/api/v1`, default `openrouter/free`, OpenRouter's own router that picks a currently available free model, so the default does not go stale when individual free models come and go.
- Custom: user-entered base URL and model (covers Cloudflare Workers AI's OpenAI-compatible endpoint, whose URL contains the account ID).
Default model names are data, editable in Settings, and checked against each provider's model list when the user taps Test.

**Error mapping.** HTTP 429 → `rate_limit` (uses `Retry-After`, default 60 s) unless the body mentions daily/quota/exhausted → `quota` (skip until local midnight). 401/403 → `auth` (skip until edited). 404 or "model not found" → `model`. Non-JSON or schema failure → `invalid_reply`. Fetch failure → `network`. Skip states live in the `providers` table so they survive restarts.

**Prompt.** `src/ai/prompt.ts` builds a system message: input may be English, Hinglish or mixed; reply with only `{"items":[...]}`; names in simple English singular ("roti", "curd", "samosa"); qty as a number when stated, else 1; unit as written or empty; slot as one of the given slot ids or empty; never include nutrition. Six mixed English/Hinglish few-shot examples are included for every provider (cheap, and the same block is reused by the phone model).

**Validation with zod.** `src/ai/schema.ts`: items 1–20; `qty` is `number > 0` or a string resolved by `quantityWords.ts`; unknown extra fields stripped (this is how nutrition fields are ignored).

**Matching in `src/core/match.ts`.** Pipeline: normalize → exact lookup → variants (strip trailing `s`/`es`, collapse doubled vowels, a small spelling map) → fuzzy Damerau-Levenshtein over all names/aliases (thresholds from the spec), ties broken by shortest name. Returns `{food, kind: 'exact'|'variant'|'fuzzy', alternatives}` or `null`.

**Storage.** Migration v2 adds `providers` (id, kind, label, base_url, model, position, enabled, skip_until, skip_reason, last_error). Keys live only in `expo-secure-store` under `provider-key-<id>`.

**Keys and holds.** Keys live in `expo-secure-store` behind a `KeyStore` interface (an in-memory one is used in tests); Settings shows a saved key only as dots plus its last 4 characters. A provider on hold keeps its state in the `providers` table (rate limit for the `Retry-After` time or 60 s, daily quota until the next local midnight, rejected key until the user changes the key, model or address). A failed Test puts a saved provider on hold the same way, and a good Test clears it. A daily limit is told apart from a per-minute one by looking for "per day", "daily", RPD or TPD in the error text (Gemini wraps both kinds in the same message).

**Typing flow.** The Log tab sends the text through the chain and puts the result in a small in-memory `ParseSession`; the confirm screen reads it. Only items with a found food and a valid amount are logged. If some items are not ready (food not found, bad amount), the ready ones are logged and the rest stay on the screen with a note, so nothing is dropped silently. A bare "sawa" means 1.25 ("sawa katori"), "sawa do" 2.25.

**Onboarding.** The AI step is step 6, after usual foods, and is where "Finish" now lives. Providers added there are saved straight away (they are not part of the profile transaction), so skipping or finishing both complete onboarding.

**Offline check.** `expo-network` is checked before trying cloud providers; offline goes straight to manual pick.

**Test sentences.** `src/ai/__fixtures__/sentences.ts` holds 25–30 English, Hinglish and mixed sentences with expected items, used by unit tests (with recorded replies) and by a manual `npm run eval:parse` script that runs them against a real provider when a key is supplied by environment variable.

## Risks / Trade-offs

- [Free tiers and model names change often] → model names are editable data, Test reports "model not found", and the fallback chain keeps logging working.
- [Some providers ignore `response_format`] → the client also extracts the first JSON object from plain text before validating.
- [Fuzzy matching can pick the wrong food] → fuzzy matches are highlighted and alternatives shown; nothing logs without confirm.
- [Typed text goes to a third party] → privacy notes per provider; a phone-only switch arrives with `add-on-device-fallback`.
