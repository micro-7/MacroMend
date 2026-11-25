# Play Store listing: MacroMend

Everything to paste into Play Console. The data-safety answers must match Settings → About → "Your privacy" (`src/about/content.ts`) and `docs/privacy-policy.md`; change all three together.

## Basics

- **App name:** MacroMend (10 of 30 characters)
- **Default language:** English (India or United States)
- **App or game:** App · **Free or paid:** Free
- **Category:** Health & Fitness
- **Privacy policy URL:** https://micro-7.github.io/MacroMend/privacy-policy
- **Contains ads:** No
- **Contact email:** a public email you are happy to show (Play requires one)

## Short description (max 80 characters)

Log Indian meals by typing "2 roti and dal". Calories and protein, offline.

## Full description (max 4000 characters)

MacroMend is a simple calorie and protein tracker built for how people actually eat in India, whether you are vegetarian, vegan, eggetarian or non-vegetarian.

Type what you ate, in English, Hinglish or a mix: "do roti aur ek katori dal", "office mein 2 samosa kha liye". MacroMend works out the foods and amounts, shows them to you to check, and only then logs them. The calories and protein always come from a built-in food table of 400+ foods, never from an AI guess. If a food is not in the table, you can search USDA FoodData Central or Open Food Facts, or enter the values yourself.

What you get
- A daily budget for calories and protein, set from your goal (cut, maintain or bulk), body details and diet type.
- Meal slots you can rename, and a "what's left today" view.
- "Fix my day": suggestions from your own usual foods to fill the gap in calories and protein.
- Optional AI typing: add your own free Gemini, Groq or OpenRouter key, or download a small AI model that runs entirely on newer phones, so logging works with no internet.
- Works offline. Your data stays on your phone: no account, no login, no ads, no tracking.
- Delete everything with one tap.

MacroMend is a logging aid, not medical advice. Estimates for home-cooked dishes vary; check the numbers for foods you eat often.

## Graphics

- **App icon:** 512 x 512 PNG, 32-bit. Export `assets/icon.png` (1024) scaled to 512.
- **Feature graphic:** 1024 x 500 PNG or JPG: plain green (#2E7D32) background, the white MacroMend mark on the left, the text "Log meals by typing" on the right.
- **Phone screenshots (at least 2, up to 8; 16:9 or 9:16, 320 px to 3840 px per side):**
  1. Home with "what's left today" card
  2. Log screen with "2 roti and dal" typed
  3. Check and log confirmation list ("Understood by: ...")
  4. Fix my day suggestions
  5. Settings → Phone model
  6. About → Your privacy

## Data safety form

Answer the questionnaire like this:

| Question | Answer | Why (matches About) |
| --- | --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** (see below: data you send to a third party at the user's request) | Typed text goes to AI providers the user adds; food names go to USDA / Open Food Facts |
| Is all of the user data collected by your app encrypted in transit? | **Yes** | All requests use HTTPS |
| Do you provide a way for users to request that their data be deleted? | **Yes**: Settings → About → "Delete all my data" (and uninstalling) | Nothing is held by the developer |
| Data collected by the developer | **None.** No data is sent to the developer or any developer-run server | "No MacroMend server" |
| Data **shared** with third parties | Text the user types for logging food (category: App activity / Other user-generated content) is sent to the AI provider *the user chooses and configures* with their own key; food search terms are sent to USDA and Open Food Facts. Mark as **optional** and **user-initiated**; purpose **App functionality** | "typed text goes only to the AI providers you added... only food names are sent for online lookups" |
| Health and fitness data (weight, height, age, calorie logs) | Stored on the device only; **not collected, not shared** | "Everything you enter is stored only on this phone" |
| Location, contacts, photos, files, device IDs, financial info, messages | **Not collected** | Not used |
| Ads, analytics, crash reporting | **None** | "no analytics, no ads and no crash reporting" |

If Play's wording makes you choose between "collected" and "shared" for the optional third-party requests, choose **shared**, optional, for app functionality only.

## Content rating (IARC questionnaire)

- Category: Utility / reference or Health & fitness.
- Violence, sexual content, language, controlled substances, gambling: **No** to all.
- User-generated content shared with other users: **No**. Location shared: **No**. Purchases: **No**.
- Expected rating: Everyone / PEGI 3 / IARC 3+.

## Other declarations

- **Target audience:** 18 and over (a diet app is not for children). Not designed for children.
- **Health apps declaration:** Select that the app provides nutrition and weight management support; it is **not** a medical device and gives no diagnosis. Add the disclaimer "not medical advice" (already in the description).
- **Government apps / financial features / news:** No.
- **Permissions:** the app asks for none beyond internet access (declared automatically).

## Testing requirement for new personal developer accounts

A personal account created after November 2023 must run a **closed test with at least 12 testers opted in for 14 continuous days** before it can apply for production access. Steps are in `docs/release.md` section 4. Start recruiting testers as soon as the first AAB is uploaded.
