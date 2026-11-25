import { seedsFromRows, type SeedRow } from './types';

// Common non-Indian and generic foods. These are typical reference values per
// 100 g (consistent with USDA/standard food composition tables) written into
// the app by hand, NOT downloaded rows, so they carry the source "built-in".
// See docs/food-data-sources.md.
const ROWS: SeedRow[] = [
  // Fruit
  ['papaya', 'papaya', 'papita', 'vegan', 'g', 1, 43, 0.5],
  ['watermelon', 'watermelon', 'tarbooz|tarbuj', 'vegan', 'g', 1, 30, 0.6],
  ['pomegranate', 'pomegranate', 'anar|pomegranate seeds', 'vegan', 'g', 1, 83, 1.7],
  ['guava', 'guava', 'amrud|peru', 'vegan', 'piece', 100, 68, 2.6],
  ['chikoo', 'chikoo', 'sapota|chiku|sapodilla', 'vegan', 'piece', 80, 83, 0.4],
  ['lychee', 'lychee', 'litchi|leechi', 'vegan', 'g', 1, 66, 0.8],
  ['mosambi', 'sweet lime', 'mosambi|mosambi fruit|sweet lemon', 'vegan', 'piece', 120, 43, 0.8],
  ['lemon', 'lemon', 'nimbu|lime|lemons', 'vegan', 'piece', 60, 29, 1.1],
  ['jackfruit', 'jackfruit', 'kathal ripe|ripe jackfruit', 'vegan', 'g', 1, 95, 1.7],
  ['custard-apple', 'custard apple', 'sitaphal|sharifa', 'vegan', 'piece', 150, 94, 2.1],
  ['dragon-fruit', 'dragon fruit', 'pitaya|kamalam', 'vegan', 'g', 1, 60, 1.2],
  ['amla', 'amla', 'indian gooseberry|gooseberry', 'vegan', 'piece', 20, 44, 0.9],
  ['coconut-water', 'coconut water', 'nariyal pani|tender coconut water', 'vegan', 'glass', 250, 19, 0.7],
  // Vegetables
  ['potato-boiled', 'boiled potato', 'aloo boiled|boiled aloo|uble aloo', 'vegan', 'piece', 150, 87, 1.9],
  ['green-peas', 'green peas', 'matar|peas|hara matar', 'vegan', 'g', 1, 81, 5.4],
  ['corn-boiled', 'boiled corn', 'bhutta|sweet corn|corn|corn on the cob', 'vegan', 'g', 1, 96, 3.4],
  ['okra', 'okra', 'bhindi|lady finger|ladyfinger', 'vegan', 'g', 1, 33, 1.9],
  ['bottle-gourd', 'bottle gourd', 'lauki|ghiya|doodhi', 'vegan', 'g', 1, 14, 0.6],
  ['bitter-gourd', 'bitter gourd', 'karela|bitter melon', 'vegan', 'g', 1, 17, 1],
  ['radish', 'radish', 'mooli|muli', 'vegan', 'g', 1, 16, 0.7],
  ['drumstick', 'drumstick', 'moringa|sahjan|drumstick pods', 'vegan', 'g', 1, 37, 2.1],
  ['spring-onion', 'spring onion', 'hari pyaz|scallion|green onion', 'vegan', 'g', 1, 32, 1.8],
  ['ginger', 'ginger', 'adrak', 'vegan', 'g', 1, 80, 1.8],
  // Grains, pasta, bread
  ['quinoa', 'quinoa', 'cooked quinoa', 'vegan', 'katori', 150, 120, 4.4],
  ['barley', 'barley', 'jau|cooked barley|pearl barley', 'vegan', 'katori', 150, 123, 2.3],
  ['bulgur', 'bulgur', 'cooked bulgur', 'vegan', 'katori', 150, 83, 3.1],
  ['millet', 'millet', 'cooked millet|foxtail millet|kangni', 'vegan', 'katori', 150, 119, 3.5],
  ['sabudana', 'sabudana', 'sago|tapioca pearls|sabudana khichdi', 'vegan', 'g', 1, 358, 0.2],
  ['vermicelli', 'vermicelli', 'seviyan|sevai|semiya', 'vegan', 'g', 1, 352, 10],
  ['pasta-whole-wheat', 'whole wheat pasta', 'wholewheat pasta|brown pasta', 'vegan', 'katori', 150, 124, 5.3],
  ['bagel', 'bagel', 'bagels', 'veg', 'piece', 90, 250, 10],
  ['croissant', 'croissant', '', 'veg', 'piece', 60, 406, 8.2],
  ['pizza-cheese', 'cheese pizza', 'pizza|pizza slice|margherita pizza', 'veg', 'slice', 107, 266, 11],
  ['burger-veg', 'veg burger', 'burger|aloo tikki burger|vegetable burger', 'veg', 'piece', 130, 240, 9],
  ['burger-chicken', 'chicken burger', '', 'non-veg', 'piece', 150, 250, 14],
  ['french-fries', 'french fries', 'fries|chips|finger chips', 'vegan', 'g', 1, 312, 3.4],
  ['potato-chips', 'potato chips', 'wafers|lays|crisps|chips packet', 'vegan', 'g', 1, 536, 7],
  ['popcorn', 'popcorn', 'air popped popcorn|makai popcorn', 'vegan', 'g', 1, 387, 13],
  ['granola', 'granola', 'granola cereal', 'veg', 'g', 1, 471, 10],
  // Plant protein
  ['tofu', 'tofu', 'soya paneer|bean curd|firm tofu', 'vegan', 'g', 1, 76, 8.1],
  ['tempeh', 'tempeh', '', 'vegan', 'g', 1, 192, 20],
  ['seitan', 'seitan', 'wheat meat|seitan cooked', 'vegan', 'g', 1, 125, 22],
  ['lentils', 'lentils', 'cooked lentils|boiled lentils', 'vegan', 'katori', 150, 116, 9],
  ['chickpeas', 'chickpeas', 'boiled chickpeas|kabuli chana|chana boiled|garbanzo beans', 'vegan', 'katori', 150, 164, 8.9],
  ['black-beans', 'black beans', 'cooked black beans', 'vegan', 'katori', 150, 132, 8.9],
  ['kidney-beans-boiled', 'kidney beans boiled', 'boiled rajma|rajma boiled', 'vegan', 'katori', 150, 127, 8.7],
  ['edamame', 'edamame', 'soybeans boiled|boiled soybeans', 'vegan', 'g', 1, 121, 11.9],
  // Meat, fish, seafood
  ['salmon', 'salmon', 'cooked salmon|grilled salmon|salmon fillet', 'non-veg', 'g', 1, 206, 22.1],
  ['sardines', 'sardines', 'canned sardines|tinned sardines', 'non-veg', 'g', 1, 208, 24.6],
  ['shrimp', 'shrimp', 'prawns|jhinga|cooked prawns|cooked shrimp', 'non-veg', 'g', 1, 99, 24],
  ['tilapia', 'tilapia', 'cooked tilapia', 'non-veg', 'g', 1, 128, 26.2],
  ['cod', 'cod', 'cooked cod|cod fish', 'non-veg', 'g', 1, 105, 23],
  ['rohu', 'rohu fish', 'rohu|rui|raw rohu', 'non-veg', 'g', 1, 97, 16.6],
  ['chicken-thigh', 'chicken thigh', 'chicken thighs|boneless chicken thigh', 'non-veg', 'g', 1, 179, 24.8],
  ['chicken-wings', 'chicken wings', 'chicken wing|buffalo wings', 'non-veg', 'piece', 30, 290, 27],
  ['goat-meat', 'goat meat', 'mutton|boiled mutton|cooked mutton', 'non-veg', 'g', 1, 143, 27.1],
  ['pork-loin', 'pork loin', 'pork|pork chop|cooked pork', 'non-veg', 'g', 1, 242, 27.3],
  ['ground-beef', 'ground beef', 'beef mince|minced beef|beef', 'non-veg', 'g', 1, 250, 26],
  // Dairy and extras
  ['milk-powder', 'milk powder', 'dried milk|full cream milk powder|skim milk powder', 'veg', 'g', 1, 496, 26.3],
  ['ice-cream', 'ice cream', 'vanilla ice cream|icecream', 'veg', 'scoop', 66, 207, 3.5],
  ['mayonnaise', 'mayonnaise', 'mayo', 'egg', 'tbsp', 14, 680, 1],
  ['honey', 'honey', 'shahad|madhu', 'veg', 'tbsp', 21, 304, 0.3],
  ['jam', 'jam', 'mixed fruit jam|fruit jam|kissan jam', 'vegan', 'tbsp', 20, 278, 0.4],
  ['dark-chocolate', 'dark chocolate', 'chocolate dark|70% chocolate', 'vegan', 'g', 1, 546, 4.9],
  ['milk-chocolate', 'milk chocolate', 'chocolate|dairy milk|chocolate bar', 'veg', 'g', 1, 535, 7.7],
  ['cocoa-powder', 'cocoa powder', 'cocoa|unsweetened cocoa', 'vegan', 'g', 1, 228, 19.6],
  ['cake', 'plain cake', 'cake|sponge cake|cake slice', 'egg', 'piece', 60, 350, 5],
  ['doughnut', 'doughnut', 'donut|donuts', 'egg', 'piece', 60, 452, 4.9],
  ['pancake', 'pancake', 'pancakes', 'egg', 'piece', 40, 227, 6.4],
  // Drinks
  ['cola', 'cola', 'coke|pepsi|soft drink|soda|thums up', 'vegan', 'glass', 250, 42, 0],
  ['energy-drink', 'energy drink', 'red bull|monster', 'vegan', 'glass', 250, 45, 0],
  ['green-tea', 'green tea', 'black tea|tea without milk|lemon tea', 'vegan', 'cup', 240, 1, 0],
];

export const GLOBAL_FOODS = seedsFromRows('g', ROWS);
