// Trimmed copies of real API responses recorded on 2026-11-25 (only the fields the app reads), plus a few
// hand-made variants for cases that are hard to find on demand. Each is labelled.

/** REAL: api.nal.usda.gov/fdc/v1/foods/search?query=cheddar cheese (first two results, trimmed). */
export const USDA_REAL = {
  totalHits: 60097,
  foods: [
    {
      fdcId: 2057648, description: 'CHEDDAR CHEESE', dataType: 'Branded', brandOwner: 'Grafton Village Cheese Co, LLC', brandName: 'GRAFTON VILLAGE',
      servingSizeUnit: 'g', servingSize: 28.0, householdServingFullText: '1 ONZ',
      foodNutrients: [
        { nutrientId: 1003, nutrientName: 'Protein', nutrientNumber: '203', unitName: 'G', value: 21.4 },
        { nutrientId: 1004, nutrientName: 'Total lipid (fat)', nutrientNumber: '204', unitName: 'G', value: 28.6 },
        { nutrientId: 1008, nutrientName: 'Energy', nutrientNumber: '208', unitName: 'KCAL', value: 393 },
      ],
    },
    {
      fdcId: 2021597, description: 'CHEDDAR CHEESE', dataType: 'Branded', brandOwner: 'Weis Markets, Inc.', brandName: 'WEIS',
      servingSizeUnit: 'g', servingSize: 28.0, householdServingFullText: '1 ONZ',
      foodNutrients: [
        { nutrientId: 1003, nutrientName: 'Protein', nutrientNumber: '203', unitName: 'G', value: 25.0 },
        { nutrientId: 1008, nutrientName: 'Energy', nutrientNumber: '208', unitName: 'KCAL', value: 393 },
      ],
    },
  ],
};

/** HAND-MADE variants of the same shape. */
export const USDA_VARIANTS = {
  foods: [
    // Reference foods report energy as Atwater value 958 instead of 208, and have no brand or serving.
    { fdcId: 111, description: 'Chicken, breast, raw', dataType: 'Foundation', foodNutrients: [
      { nutrientNumber: '958', unitName: 'KCAL', value: 106 }, { nutrientNumber: '203', unitName: 'G', value: 22.5 } ] },
    // Energy only in kilojoules.
    { fdcId: 222, description: 'Rice cooked', dataType: 'SR Legacy', foodNutrients: [
      { nutrientNumber: '208', unitName: 'kJ', value: 543.9 }, { nutrientNumber: '203', unitName: 'G', value: 2.7 } ] },
    // No protein value: dropped.
    { fdcId: 333, description: 'Mystery food', dataType: 'Branded', foodNutrients: [{ nutrientNumber: '208', unitName: 'KCAL', value: 100 }] },
    // No id or description: dropped.
    { description: 'No id', foodNutrients: [] },
  ],
};

/** REAL: world.openfoodfacts.org search for "muesli" (three products, nutriments trimmed to the keys the app reads). */
export const OFF_REAL = {
  count: 10710, page: 1, page_size: 3,
  products: [
    {
      brands: 'Quaker, Cruesli', code: '3168930010265', product_name: 'cruesly mélange de noix', serving_quantity: 45, serving_size: '45 g',
      ingredients_analysis_tags: ['en:palm-oil-free', 'en:non-vegan', 'en:maybe-vegetarian'], labels_tags: ['en:no-palm-oil'],
      nutriments: { 'energy-kcal_100g': 462, 'energy-kj_100g': 1913, energy_100g: 1913, proteins_100g: 8.5 },
    },
    {
      brands: 'Bjorg', code: '3229820129488', product_name: 'muesli raisin,datte,figue', serving_quantity: 60, serving_size: '60g',
      ingredients_analysis_tags: ['en:palm-oil-free', 'en:vegan-status-unknown', 'en:vegetarian-status-unknown'], labels_tags: ['en:organic'],
      nutriments: { 'energy-kcal_100g': 352, 'energy-kj_100g': 1485, energy_100g: 1485, proteins_100g: 11 },
    },
    {
      brands: 'The Jordans & Ryvita Company Limited - A Division of ABF Grain Products Limited', code: '5010477348678',
      product_name: 'Special Muesli 30% fruits & noix', serving_quantity: 45, serving_size: '45 g',
      ingredients_analysis_tags: ['en:palm-oil-free', 'en:vegan-status-unknown', 'en:vegetarian'], labels_tags: ['en:vegetarian'],
      nutriments: { 'energy-kcal_100g': 360, 'energy-kj_100g': 1523, energy_100g: 1523, proteins_100g: 10 },
    },
  ],
};

/** HAND-MADE variants of the same shape. */
export const OFF_VARIANTS = {
  products: [
    // Only kilojoules (1674 kJ = 400.1 kcal), a vegan label, no serving size.
    { code: '1', product_name: 'Plant whey', brands: 'Acme', ingredients_analysis_tags: ['en:vegan'], nutriments: { energy_100g: 1674, proteins_100g: '80' } },
    // No protein: dropped.
    { code: '2', product_name: 'No protein listed', nutriments: { 'energy-kcal_100g': 100 } },
    // No energy: dropped.
    { code: '3', product_name: 'No energy listed', nutriments: { proteins_100g: 10 } },
    // No name: dropped.
    { code: '4', product_name: '  ', nutriments: { 'energy-kcal_100g': 100, proteins_100g: 10 } },
    // Egg product marked vegetarian.
    { code: '5', product_name: 'Egg white powder', ingredients_analysis_tags: ['en:vegetarian'], nutriments: { 'energy-kcal_100g': 376, proteins_100g: 80 } },
    // Marked non-vegetarian.
    { code: '6', product_name: 'Chicken salami', ingredients_analysis_tags: ['en:non-vegetarian'], nutriments: { 'energy-kcal_100g': 250, proteins_100g: 20 } },
  ],
};
