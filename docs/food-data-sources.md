# Food data sources

Every calorie and protein number in MacroMend comes from the food table. This
file says where the bundled rows come from and how far to trust them. Numbers
are per 100 g. The bundled catalog version is `CATALOG_VERSION` in
`src/data/foods/index.ts`; bump it whenever a row changes.

## `src/data/foods/usda.ts` — 63 rows, source `usda`

Real rows from USDA FoodData Central, **Foundation Foods** (public domain,
CC0 1.0), fetched on 2026-11-25. Each row keeps its FDC id (`externalId`,
for example `fdc:748967` for whole egg). kcal (nutrient 208) and protein
(nutrient 203) are exactly what FDC reports. The unit and grams-per-unit
(piece, glass, slice and so on) are our own household-portion choices, not FDC
values.

Only foods that FDC reports a plain kcal value for were usable (95 of 424
Foundation foods); the rest report energy under a different nutrient number
and were not fetched.

## `src/data/foods/global.ts` — 108 rows, source `built-in`

Common fruit, vegetables, grains, plant proteins, fish, meat, dairy extras and
drinks. These are **typical reference values written by hand**, consistent
with standard food-composition tables such as USDA, but they are **not
downloaded rows and carry no FDC id**. Each one should be checked against
FoodData Central before relying on it (the in-app "My foods" editor in a later
change lets a user correct any value).

## `src/data/foods/indian.ts` — 167 rows, source `built-in`

Indian staples, dishes and snacks (rotis, rice dishes, dals, curries, street
food, sweets, drinks, dry fruit). Values are **typical home-style reference
values per 100 g of the food as eaten** (cooked where relevant). They are
**not copied from IFCT 2017 (NIN) or any other licensed table**, and they are
**not individually cited**. Dish values (curries, biryani, street food) vary
a lot between recipes. The spec's open question about the source and licence
for the Indian table is still open: before a public release, check these rows
against IFCT 2017 and confirm whether its licence allows bundling the numbers.

## Checks that run in `npm test`

`src/data/foods/__tests__/catalog.test.ts` fails if any food has a duplicate
id, a name or alias shared with another food, a missing field, a negative
value, kcal above 900 or protein above 100 per 100 g, protein energy
(protein × 4) above total kcal, or a `usda` row without an FDC id. These catch
typos, not wrong-but-plausible numbers.

## Licences

- USDA FoodData Central: public domain (CC0 1.0). Attribution is shown in the
  About screen (`polish-and-release`).
- Open Food Facts (ODbL) is not bundled; it is only searched online
  (`add-online-food-lookup`).
