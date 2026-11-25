# MacroMend — Android Diet App Spec

Nov 24, 2026

## Overview

An Android app that fixes the rest of your day after you go off-plan: log what you ate in English or Hinglish, see what's left of today's protein and calories, and get your remaining meals rebalanced from your own usual foods.

- **Problem:** existing trackers (MyFitnessPal, HealthifyMe) log well but don't rebuild the rest of your day around Indian veg food, or lock that behind a paid plan.
- **Who it's for:** anyone cutting, maintaining or bulking. Indian vegetarian food (paneer, dal, roti, curd, whey) is the default and the best-covered, but any cuisine and any diet type works: vegetarian, eggetarian, non-veg or vegan.
- **What's different:** India-first staples plus global foods, free-text logging in English or Hinglish, works offline with an on-device model, and anyone can plug in their own free key (Gemini, Groq, OpenRouter).
- **Closest existing work:** [maqro](https://github.com/hyp3rd/maqro) (web, fills remaining macros from saved recipes) and [fud-ai](https://github.com/apoorvdarshan/fud-ai) (BYOK calorie tracker). Neither is built around Indian staples, understands Hinglish, or runs a model on the phone.

## MVP features

The MVP is five pieces of behaviour; everything else waits.

1. **Setup (about a minute, no login):**
   - Goal: cut, maintain or bulk.
   - Daily targets: type calories and protein directly, or let the app work them out from weight, height, age, sex and activity level.
   - Diet type: vegetarian, eggetarian, non-veg or vegan. This only filters what "Fix my day" suggests; you can log anything.
   - Meals per day: breakfast, lunch, snack, dinner by default; rename or add slots (e.g. pre-workout).
   - Usual foods (staples): tick what you normally have, e.g. paneer, whey, eggs, roti, dal, chicken, oats.
   - AI setup (optional): add free keys (Gemini, Groq, OpenRouter) or download the phone model; skip to log manually.
2. **Log in English or Hinglish:** type "had 2 roti and dal" or "office mein 2 samosa kha liye", any cuisine, veg or non-veg. The app shows what it understood for a quick confirm, then logs it to the right slot.
3. **What's left today:** one card with remaining kcal and protein, updated after every log, plus a warning when a target is already crossed.
4. **Fix my day:** one tap fills the remaining open meals from your staples, protein first, in real portions (1 roti, 100 g paneer, 1 scoop whey, 2 eggs). Swap or shuffle a suggestion, then log it.
5. **Settings:** manage and order API keys, download or delete the phone model, "phone model only" privacy switch, edit targets and staples.

**Later, not in MVP:** photo logging, voice input, weekly trends, recipes, cloud sync.

## Architecture

An offline-first Expo app: AI only turns text into food items; a food table supplies every number; plain code does the maths.

**Stack**

- Expo (React Native, TypeScript), Android first, built as an Expo development build (needed for native AI libraries; Expo Go won't work).
- SQLite on the phone (`expo-sqlite`) for profile, foods, staples and logs. No backend, no login.
- react-native-executorch for the on-device model; `fetch` with OpenAI-format requests for cloud providers.

**How one log flows**

1. User types text in English, Hinglish or a mix.
2. **Parser** sends it to the first working provider (cloud keys in the user's order → phone model → manual pick) and gets back `{"items":[{"name","qty","unit","slot"}]}`, validated with a schema (e.g. zod).
3. **Food matcher** finds each item in the food table by name or alias ("dahi" = "curd", "chapati" = "roti"), with fuzzy matching for typos.
4. **Not in the table?** Look it up online in USDA FoodData Central or Open Food Facts; still missing → the AI estimates kcal and protein, marked "estimated" for the user to check and save.
5. **Quantity converter** turns qty + unit (piece, katori, scoop, g, "aadha", "do") into grams, then kcal and protein.
6. User confirms; the entry is saved to `logs`.
7. **Rebalance engine** (pure functions, unit-tested) recomputes what's left and fills open slots from staples allowed by the diet type.

**Language support**

- One parser handles English, Hinglish and mixed text; the prompt says input may be any of these and output is always English JSON.
- Food names carry aliases in both languages; number and portion words ("do", "teen", "aadha", "ek katori", "half bowl") are mapped in code, not by the AI.
- The phone model gets 5–6 mixed English/Hinglish examples in its prompt, since small models are weaker at Hinglish.
- App screens are English for v1.

**Food data sources**

| Source | Covers | Use |
| --- | --- | --- |
| Built-in Indian table | ~150 Indian staples with Hindi/English aliases | Bundled; the core |
| [USDA FoodData Central](https://fdc.nal.usda.gov/) | Generic global foods (chicken, eggs, oats, pasta, fish) | A few hundred common items bundled; rest searched online; public domain |
| [Open Food Facts](https://world.openfoodfacts.org/) | Packaged and branded foods (Amul, MuscleBlaze, Yoga Bar) | Searched online; barcode scan later; ODbL licence |
| AI estimate | Anything else ("dhaba butter chicken") | Last resort, always marked "estimated" |

## AI provider chain

A free cloud model with the user's own key is the primary parser; an on-device model on the phone is the fallback, so logging never stops. Cloud providers are pluggable because Gemini, Groq, OpenRouter and Cloudflare all accept OpenAI-format requests: only the base URL, key and model name change.

1. **Primary — cloud, user's own key:** the user adds one or more free keys in Settings and orders them. The app tries them top to bottom.
2. **Fallback — on-device model:** **Gemma 4 E2B**, run with [react-native-executorch](https://docs.swmansion.com/react-native-executorch/docs/fundamentals/getting-started) v0.11+ using the ready-made export from Software Mansion's [Hugging Face repo](https://huggingface.co/software-mansion/react-native-executorch-gemma-4) (use the model constant shipped in the library's model registry; Android uses the XNNPACK or Vulkan variant). It is multimodal (text, vision, audio), which can later power photo and voice logging.
3. **Last resort — manual pick:** if no model is available, the user picks foods from the table with a search box.

**Free cloud providers to support** (checked Nov 2026; free tiers change often)

| Provider | Free offer | Limits | Catch |
| --- | --- | --- | --- |
| Google Gemini | Flash and Flash-Lite models, no card | Per project, shown in AI Studio | Free-tier prompts used to improve Google products |
| Groq (with a q) | gpt-oss-120b, gpt-oss-20b, Qwen 27B, no card | 30 req/min, 1,000 req and 200K tokens/day per model | Models retired often; no training on your data |
| OpenRouter | Models ending in `:free` (Gemma, Nemotron and others) | 20 req/min; 50/day, 1,000/day after a one-time $10 top-up | Free list changes; some providers may train on prompts |
| Cloudflare Workers AI | Small open models | 10,000 Neurons/day | Needs a Cloudflare account ID too |

xAI's Grok, OpenAI, Claude and DeepSeek have no ongoing free API tier, so they are optional paid keys only. Sources: [developersdigest](https://www.developersdigest.tech/models/free-api), [byoklist](https://byoklist.com/guides/free-ai-api-keys), [grokified](https://grokified.com/blog/free-llm-api).

**When the fallback kicks in**

- No cloud key set.
- A provider returns a rate-limit or quota error — try the next key in the list; when all are used up, switch to the phone model for the rest of the day and retry cloud tomorrow.
- No internet or the request times out (about 8 s).
- User chooses "Always use phone model" in Settings for privacy.

**Model download and device rules**

- The model is not bundled in the APK. It's an optional in-app download (about 2.4–3 GB for Gemma 4 E2B) over Wi-Fi, with progress, a free-storage check and a delete button.
- Offer the download only on phones with about 8 GB RAM or more; below that, show "phone model not supported" and keep cloud keys plus manual pick.
- Native AI libraries need an Expo development build; Expo Go won't run them. react-native-executorch needs Expo SDK 55+ and the peer dependencies `react-native-worklets` and `react-native-blob-util`.

**One contract for every provider**

Every provider takes the user's text and returns the same JSON, validated before use:

```
{"items":[{"name":"samosa","qty":2,"unit":"piece","slot":"snack"}]}
```

The model never supplies calories or protein for foods in the table. Numbers come from the food table, so a small on-device model can't invent nutrition values. Only foods found nowhere get an AI estimate, always marked "estimated".

## Data model

Four tables in on-phone SQLite; nothing leaves the phone except the text sent to a cloud model and online food lookups.

| Table | Key fields | Notes |
| --- | --- | --- |
| `profile` | goal (cut, maintain, bulk), diet_type (veg, eggetarian, non-veg, vegan), weight_kg, height_cm, age, sex, activity, kcal_target, protein_target_g, slots | One row; targets typed directly or computed from the body fields |
| `foods` | id, name, aliases (English + Hindi/Hinglish: "curd", "dahi"), category (veg, egg, non-veg, vegan), unit, grams_per_unit, kcal_per_100g, protein_per_100g, source | `source` = built-in, usda, openfoodfacts, user, or ai-estimated (flagged); `category` drives the diet filter |
| `staples` | food_id, usual_qty | Foods the user usually has; rebalance picks only from these |
| `logs` | date, slot, food_id, qty, grams, kcal, protein_g, raw_text, estimated | `raw_text` keeps what the user typed; `estimated` marks AI-guessed numbers |

**Rebalance rule (no AI):** remaining = target minus today's logs. Spread remaining protein across open slots, filling each slot with the user's protein staples first (only foods allowed by their diet type), then carbs such as roti, rice, oats or pasta for calories. Round to real portions (1 roti, 50 g paneer, 2 eggs, 1 scoop whey).

## OpenSpec change order

One change at a time, each shippable on my own phone.

1. `setup-app-shell`: Expo dev build, SQLite schema, bundled food table (Indian staples + common USDA foods), navigation.
2. `add-onboarding`: goal, targets (typed or calculated), diet type, meal slots, staples picker.
3. `add-manual-logging`: search and pick foods, quantity input, what's-left card.
4. `add-rebalance`: "Fix my day" from staples with the diet filter, swap and log.
5. `add-cloud-parsing`: English/Hinglish text → items via a pluggable OpenAI-compatible provider list (Gemini, Groq, OpenRouter), alias + portion-word matching, key settings, quota-error handling.
6. `add-online-food-lookup`: USDA FoodData Central and Open Food Facts search for foods not in the table, then AI estimate marked "estimated".
7. `add-on-device-fallback`: model download screen, react-native-executorch, RAM check, auto-switch rules. Phone model: Gemma 4 E2B (see AI provider chain). Test it with 20–30 real mixed English/Hinglish sentences and confirm it gets most right.
8. `polish-and-release`: app icon, Play Store listing (one-time $25 developer fee).

## Risks and open questions

- **Free tiers change fast:** Groq retired several models in 2026 and Mistral dropped free API access. Keep model names in settings, not hard-coded.
- **Food data accuracy:** where do the ~150 staple values come from? Candidate: the NIN *Dietary Guidelines for Indians* and IFCT tables; check licence before bundling.
- **Low-end phones:** Gemma 4 E2B needs about 8 GB RAM and 3 GB free storage; phones below that rely on cloud keys or manual pick.
- **Privacy:** Gemini's free tier uses prompts to improve Google products; say so in Settings and offer "phone model only".
- **App name:** MacroMend.
- **Open question:** Android only for v1, or keep iOS in mind from the start? Expo allows both.
