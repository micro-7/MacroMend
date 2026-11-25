# Proposal

## Why

Typing "office mein 2 samosa kha liye" is much faster than searching and picking each food, and understanding English and Hinglish is a core promise of MacroMend (docs/SPEC.md, MVP feature 2 and "AI provider chain"). Free cloud models with the user's own key make this possible at no cost; the AI only turns text into items, and the food table still supplies every number.

## What Changes

- A "Type what you ate" box on the Log tab: the text goes to the user's AI providers, comes back as `{"items":[{"name","qty","unit","slot"}]}`, is validated, matched to the food table and shown for a quick confirm before logging.
- Pluggable OpenAI-compatible providers: presets for Google Gemini, Groq and OpenRouter, plus a custom entry (base URL + model), for example Cloudflare Workers AI. Keys stored securely on the phone; model names editable, never hard-coded only.
- Provider order: tried top to bottom; rate-limit, quota, timeout (8 s), auth and network errors move to the next; if none work, the user falls back to manual pick.
- Food matcher: exact name/alias, plural and spelling variants, then fuzzy matching for typos; unmatched items are flagged for manual pick.
- Number and portion words handled in code: "ek", "do", "teen", "aadha", "dedh", "ek katori", "half bowl" and unit spellings such as "pcs", "gm".
- Settings → AI providers: add, test, reorder, disable and delete keys, with each provider's privacy note (e.g. Gemini's free tier uses prompts to improve Google products).
- Onboarding gains an optional "AI setup" step after usual foods.

## Capabilities

### New Capabilities
- `text-logging`: logging from free text in English, Hinglish or a mix, with confirm-before-save.
- `ai-providers`: the user's cloud AI provider list, keys, order, privacy notes and fallback between providers.
- `food-matching`: turning parsed food names into foods in the table, including aliases, variants and typos.

### Modified Capabilities
- `portion-conversion`: adds Hindi/Hinglish and English number and portion words and unit spellings.
- `onboarding`: adds an optional AI setup step at the end.

## Impact

- New modules: `src/ai/` (provider client, prompt, schema, chain), `src/core/match.ts`, `src/core/quantityWords.ts`; storage `src/db/providers.ts`; secure key storage via `expo-secure-store`.
- New dependencies: `zod`, `expo-secure-store`, `expo-network`.
- Schema: adds a `providers` table (migration v2) for non-secret provider settings.
- Sends only the typed text and the user's slot names to the chosen provider; no other data leaves the phone.
