import type { FoodCategory, FoodSeed } from './types';

// Rows taken from USDA FoodData Central (Foundation Foods, public domain,
// CC0 1.0), fetched on 2026-11-25. kcal and protein are per 100 g exactly as
// FDC reports them (nutrients 208 and 203). The unit and grams-per-unit are
// our own household-portion choices, not FDC values.
// [fdcId, slug, name, aliases, category, unit, gramsPerUnit, kcal, protein]
type UsdaRow = [number, string, string, string, FoodCategory, string, number, number, number];

const ROWS: UsdaRow[] = [
  // Eggs
  [748967, 'egg', 'egg', 'eggs|anda|boiled egg|whole egg|egg whole|fried egg', 'egg', 'piece', 50, 148, 12.4],
  [747997, 'egg-white', 'egg white', 'egg whites|anda safed', 'egg', 'piece', 33, 55, 10.7],
  [748236, 'egg-yolk', 'egg yolk', 'egg yolks', 'egg', 'piece', 17, 334, 16.2],
  // Dairy and cheese
  [746782, 'milk-whole', 'whole milk', 'full cream milk|full fat milk|cow milk', 'veg', 'glass', 250, 60, 3.27],
  [746778, 'milk-2pc', 'reduced fat milk', '2% milk|two percent milk', 'veg', 'glass', 250, 50, 3.36],
  [746772, 'milk-1pc', 'low fat milk', '1% milk|lowfat milk', 'veg', 'glass', 250, 43, 3.38],
  [746776, 'milk-skim', 'skim milk', 'nonfat milk|fat free milk|skimmed milk', 'veg', 'glass', 250, 34, 3.43],
  [330137, 'greek-yogurt', 'greek yogurt', 'greek yoghurt|greek curd|nonfat greek yogurt', 'veg', 'katori', 150, 61, 10.3],
  [328841, 'cottage-cheese', 'cottage cheese', 'low fat cottage cheese|cottage cheese lowfat', 'veg', 'g', 1, 84, 11],
  [328637, 'cheddar', 'cheddar cheese', 'cheddar|cheese|amul cheddar', 'veg', 'slice', 20, 408, 23.3],
  [325198, 'cheese-processed', 'processed cheese', 'cheese slice|american cheese|amul cheese slice|processed cheese slice', 'veg', 'slice', 20, 366, 18],
  [329370, 'mozzarella', 'mozzarella cheese', 'mozzarella|pizza cheese', 'veg', 'g', 1, 298, 23.7],
  [325036, 'parmesan', 'parmesan cheese', 'parmesan|grated parmesan', 'veg', 'g', 1, 421, 29.6],
  [746766, 'ricotta', 'ricotta cheese', 'ricotta', 'veg', 'g', 1, 157, 7.81],
  [746767, 'swiss-cheese', 'swiss cheese', 'swiss', 'veg', 'slice', 20, 393, 27],
  // Meat, fish, poultry
  [331960, 'chicken-breast', 'chicken breast', 'chicken|boneless chicken|grilled chicken|chicken breast boneless|murgh', 'non-veg', 'g', 1, 166, 32.1],
  [331897, 'chicken-drumstick', 'chicken drumstick', 'chicken leg|chicken drumsticks', 'non-veg', 'piece', 60, 156, 23.9],
  [746785, 'turkey-ground', 'ground turkey', 'turkey mince|turkey crumbles', 'non-veg', 'g', 1, 220, 27.1],
  [746758, 'beef-tenderloin', 'beef tenderloin', 'beef tenderloin lean|beef steak lean', 'non-veg', 'g', 1, 176, 27.7],
  [746760, 'beef-eye-round', 'beef eye of round', 'beef eye round roast', 'non-veg', 'g', 1, 122, 23.4],
  [746761, 'beef-top-round', 'beef top round', 'beef top round roast|lean beef', 'non-veg', 'g', 1, 123, 23.7],
  [332397, 'ham', 'ham', 'deli ham|sliced ham', 'non-veg', 'slice', 25, 106, 16.7],
  [749420, 'bacon', 'bacon', 'cooked bacon|bacon strips', 'non-veg', 'slice', 8, 500, 40.9],
  [746780, 'italian-sausage', 'italian sausage', 'pork sausage|sausage', 'non-veg', 'piece', 80, 322, 18.2],
  [333374, 'haddock', 'haddock', 'haddock fish', 'non-veg', 'g', 1, 74, 16.3],
  [333476, 'pollock', 'pollock', 'pollock fish', 'non-veg', 'g', 1, 56, 12.3],
  [334194, 'tuna-canned', 'canned tuna', 'tuna|tuna in water|light tuna', 'non-veg', 'g', 1, 90, 19],
  // Flours and grains
  [790085, 'flour-whole-wheat', 'whole wheat flour', 'atta|wheat flour|gehun ka atta|chakki atta', 'vegan', 'g', 1, 370, 15.1],
  [789951, 'flour-ap', 'all purpose flour', 'maida|plain flour|refined flour', 'vegan', 'g', 1, 358, 13.1],
  [790146, 'flour-bread', 'bread flour', 'strong flour', 'vegan', 'g', 1, 363, 14.3],
  [790214, 'flour-rice', 'rice flour', 'chawal ka atta|white rice flour', 'vegan', 'g', 1, 359, 6.94],
  [1104812, 'flour-rice-brown', 'brown rice flour', '', 'vegan', 'g', 1, 365, 7.19],
  [790276, 'cornmeal', 'cornmeal', 'makki atta|yellow cornmeal|corn flour', 'vegan', 'g', 1, 364, 6.2],
  [1104705, 'flour-soy', 'soy flour', 'defatted soy flour', 'vegan', 'g', 1, 366, 51.1],
  [334536, 'fried-rice', 'veg fried rice', 'fried rice|chinese fried rice', 'vegan', 'plate', 250, 174, 3.84],
  // Fruit
  [1105314, 'banana', 'banana', 'kela|bananas|ripe banana', 'vegan', 'piece', 120, 97, 0.74],
  [746771, 'orange', 'orange', 'santra|oranges|navel orange', 'vegan', 'piece', 140, 47, 0.91],
  [325430, 'peach', 'peach', 'peaches|aadu', 'vegan', 'piece', 150, 42, 0.91],
  [746773, 'pear', 'pear', 'nashpati|pears', 'vegan', 'piece', 178, 57, 0.38],
  [327357, 'nectarine', 'nectarine', 'nectarines', 'vegan', 'piece', 140, 39, 1.06],
  [327046, 'kiwi', 'kiwi', 'kiwifruit|kiwi fruit', 'vegan', 'piece', 75, 58, 1.06],
  [746770, 'cantaloupe', 'cantaloupe', 'muskmelon|kharbuja|kharbooja|melon', 'vegan', 'g', 1, 34, 0.82],
  [746768, 'figs-dried', 'dried figs', 'anjeer|dry figs|figs dried', 'vegan', 'piece', 8, 249, 3.3],
  [325287, 'grapefruit-juice', 'grapefruit juice', '', 'vegan', 'glass', 250, 37, 0.55],
  // Vegetables
  [747447, 'broccoli', 'broccoli', 'broccoli florets', 'vegan', 'g', 1, 31, 2.57],
  [1104647, 'garlic', 'garlic', 'lehsun|lahsun|garlic cloves', 'vegan', 'clove', 3, 143, 6.62],
  [790646, 'onion', 'onion', 'pyaz|pyaaz|yellow onion|onions', 'vegan', 'piece', 110, 38, 0.83],
  [790577, 'onion-red', 'red onion', 'lal pyaz', 'vegan', 'piece', 110, 44, 0.94],
  [1104962, 'onion-white', 'white onion', 'safed pyaz', 'vegan', 'piece', 110, 35, 0.89],
  [323505, 'kale', 'kale', 'kale leaves', 'vegan', 'g', 1, 35, 2.92],
  [746769, 'lettuce-romaine', 'romaine lettuce', 'lettuce|cos lettuce|salad leaves', 'vegan', 'g', 1, 17, 1.24],
  [321360, 'tomato-cherry', 'cherry tomatoes', 'grape tomatoes|cherry tomato', 'vegan', 'g', 1, 27, 0.83],
  [333281, 'tomato-canned', 'canned tomatoes', 'diced tomatoes|tinned tomatoes', 'vegan', 'g', 1, 18, 0.84],
  [321611, 'green-beans-canned', 'canned green beans', 'green beans canned', 'vegan', 'g', 1, 21, 1.04],
  // Fats, sauces, snacks
  [330458, 'coconut-oil', 'coconut oil', 'nariyal tel', 'vegan', 'tsp', 5, 833, 0],
  [321358, 'hummus', 'hummus', 'hummus dip', 'vegan', 'g', 1, 229, 7.35],
  [332282, 'pasta-sauce', 'pasta sauce', 'marinara|marinara sauce|tomato pasta sauce', 'vegan', 'g', 1, 45, 1.41],
  [746777, 'salsa', 'salsa', 'salsa sauce', 'vegan', 'g', 1, 29, 1.44],
  [747693, 'ketchup', 'ketchup', 'tomato ketchup|tomato sauce', 'vegan', 'tbsp', 17, 117, 1.11],
  [332791, 'olives-stuffed', 'green olives', 'stuffed olives|olives', 'vegan', 'g', 1, 130, 1.15],
  [325524, 'sunflower-seeds', 'sunflower seeds', 'surajmukhi beej|roasted sunflower seeds', 'vegan', 'g', 1, 612, 21],
  [333008, 'oatmeal-cookie', 'oatmeal cookie', 'oatmeal raisin cookie|cookie|cookies', 'veg', 'piece', 30, 430, 5.79],
  [746784, 'sugar', 'sugar', 'cheeni|chini|shakkar|granulated sugar', 'vegan', 'tsp', 4, 385, 0],
];

export const USDA_FOODS: FoodSeed[] = ROWS.map(
  ([fdc, slug, name, aliases, category, unit, gramsPerUnit, kcal, protein]) => ({
    id: `usda-${slug}`,
    name,
    aliases: aliases ? aliases.split('|') : [],
    category,
    unit,
    gramsPerUnit,
    kcalPer100g: kcal,
    proteinPer100g: protein,
    source: 'usda' as const,
    externalId: `fdc:${fdc}`,
  }),
);
