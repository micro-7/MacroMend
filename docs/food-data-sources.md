# Food data sources

Every calorie and protein number in MacroMend comes from the food table. This
file says where the bundled rows come from and how far to trust them. Numbers
are per 100 g. The bundled catalog version is `CATALOG_VERSION` in
`src/data/foods/index.ts`; bump it whenever a row changes.

| File | Rows | Source value | Origin |
| --- | --- | --- | --- |
| `src/data/foods/usda.ts` | 179 | `usda` | Real USDA FoodData Central rows with FDC ids |
| `src/data/foods/global.ts` | 72 | `built-in` | Typical reference values written by hand |
| `src/data/foods/indian.ts` | 155 | `built-in` | Typical home-style values written by hand |

Total: 406 foods.

## `usda.ts`: real USDA rows

Rows from USDA FoodData Central, **Foundation Foods** (public domain, CC0 1.0),
fetched on 2026-11-25 (two fetches of all 424 Foundation foods; energy is
nutrient 208, or the Atwater energy values 957/958 when 208 is absent, and
protein is nutrient 203). Each row keeps its FDC id in `externalId`
(for example `fdc:748967` for whole egg). kcal and protein are exactly what
FDC reports; every row was cross-checked against the fetched data by a script.

Not everything in Foundation Foods is what people log. Many rows are **raw or
dry** (for example dry lentils 360 kcal, raw rice 359 kcal, raw chicken breast
106 kcal), so their names say "raw" or "dry" and cooked versions live in
`indian.ts` or `global.ts`. The unit and grams-per-unit (piece, glass, slice
and so on) are our own household-portion choices, not FDC values.

## `global.ts`: typed reference values

Foods that are not in Foundation Foods (papaya, jackfruit, quinoa and other
cooked grains, cooked fish and meat, dairy extras, drinks, snacks). These are
**typical reference values written by hand**, consistent with standard
food-composition tables such as USDA, but they are **not downloaded rows and
carry no FDC id**. They should be checked against FoodData Central before
relying on them.

## `indian.ts`: typed reference values

Indian staples, dishes and snacks (rotis, rice dishes, dals, curries, street
food, sweets, drinks). Values are **typical home-style values per 100 g of the
food as eaten** (cooked where relevant). They are **not copied from IFCT 2017
(NIN) or any other licensed table** and are **not individually cited**. Dish
values (curries, biryani, street food) vary a lot between recipes.

See "Pre-release check" below for what was verified and the IFCT licence decision.

## Pre-release check (polish-and-release, task 4.3)

Done on 2026-11-25, catalog version 3.

**IFCT 2017 licence decision: do not use IFCT numbers.** The book's copyright page (National Institute of
Nutrition, ICMR) says the data may be reproduced "for personal use with full acknowledgment of the source", but
that "no part of this publication can be stored or reproduced in any electronic format for creating a product
without the prior written permission of the National Institute of Nutrition, Hyderabad." Bundling its numbers in
an app is creating a product, and no written permission exists. So **no value in this app is copied from
IFCT**, and none was changed to match IFCT. The About screen does not credit IFCT as a source. If the owner later
wants IFCT-based values, write to NIN (contact on the book's copyright page: nin@ap.nic.in) and get a written
yes first.

**Owner decision (2026-11-25): the USDA-only check is accepted; IFCT permission is not being sought for now.**

**What was checked instead.** All 155 rows in `indian.ts` and all 72 rows in `global.ts` were reviewed against
the real USDA FoodData Central rows in `usda.ts` (public domain) and standard USDA reference values for the same
or the closest food (cooked rice, cooked lentils and beans, chicken, fish, eggs, dairy, oils, flours, fruit,
vegetables, snacks). Dish values with no USDA equivalent (curries, sabzis, street food, sweets) were checked for
plausibility only (energy density and protein per 100 g in line with their ingredients) and stay approximate.
Rows that differ by more than about 10% from the reference were corrected:

| Row | Was (kcal / protein) | Now | Why |
| --- | --- | --- | --- |
| `gl-seitan` | 370 / 75 | 125 / 22 | 370/75 is dry vital wheat gluten; prepared seitan is gluten plus about 2.5 parts water, so about a third of that (self-calculated) |
| `in-sugarcane-juice` | 75 / 0.2 | 60 / 0.2 | Sources range from about 40 to 73 kcal per 100 g; set to a middle value |

Everything else was within about 10% of its reference. Home-cooked dishes still vary a lot by recipe, so check
the numbers for foods you eat often (the app lets you edit any saved food).

**Catalog test.** `src/data/foods/__tests__/catalog.test.ts` passes (see "Checks that run in `npm test`").

## Foods saved from online lookups

Foods the user finds online or estimates are stored on the phone only, in the same food table, and are never part of the bundled catalog.
They are marked by their source: `usda` or `openfoodfacts` (with their database id in `externalId`), `ai-estimated` for AI guesses
(entries of these show "est." until the user checks the values) and `user` for foods typed in by hand. Their ids start with `ext-`,
`ai-` or `user-`, and catalog updates never touch them. Open Food Facts data is under the ODbL licence and USDA FoodData Central is public
domain; both are credited next to the results.

## Checks that run in `npm test`

`src/data/foods/__tests__/catalog.test.ts` fails if any food has a duplicate
id, a name or alias shared with another food, a missing field, a negative
value, kcal above 900 or protein above 100 per 100 g, protein energy
(protein x 4) above total kcal, or a `usda` row without an FDC id; it also
requires at least 150 Indian and at least 150 USDA rows. These catch typos,
not wrong-but-plausible numbers.

## Licences

- USDA FoodData Central: public domain (CC0 1.0). Attribution is shown in the
  About screen (`polish-and-release`).
- Open Food Facts (ODbL) is not bundled; it is only searched online
  (`add-online-food-lookup`).
