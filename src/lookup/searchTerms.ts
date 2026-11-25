import { normalizeName } from '../core/text';
import { parseQuantityWords } from '../core/quantityWords';

const UNIT_WORDS = new Set([
  'scoop', 'scoops', 'katori', 'katoris', 'bowl', 'bowls', 'cup', 'cups', 'glass', 'glasses', 'plate', 'plates', 'piece', 'pieces', 'pc', 'pcs',
  'slice', 'slices', 'serving', 'servings', 'packet', 'packets', 'bar', 'bars', 'tbsp', 'tsp', 'spoon', 'spoons', 'g', 'gm', 'gms', 'gram', 'grams',
  'kg', 'ml', 'l', 'litre', 'liter', 'of',
]);

/**
 * The words to send to the food databases: the typed text without amounts and units ("1 scoop muscleblaze whey"
 * becomes "muscleblaze whey"), because every word must match a product. Falls back to the text as typed.
 */
export function searchTermsFor(query: string): string {
  const words = normalizeName(query).split(' ').filter(Boolean);
  const kept = words.filter((w) => !/^\d+(\.\d+)?(g|gm|kg|ml|l)?$/.test(w) && parseQuantityWords(w) === null && !UNIT_WORDS.has(w));
  return kept.length > 0 ? kept.join(' ') : query.trim();
}
