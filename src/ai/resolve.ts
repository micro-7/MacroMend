import { buildMatchIndex, matchFood, type FoodRef, type MatchIndex, type MatchKind } from '../core/match';
import { parseQuantityWords, resolveQuantity } from '../core/quantityWords';
import type { ParsedItem } from './types';

export interface ResolvedItem {
  parsed: ParsedItem;
  /** "not_found" means no food in the table matched the name. */
  status: 'matched' | 'not_found';
  foodId: string | null;
  foodName: string | null;
  matchKind: MatchKind | null;
  alternatives: FoodRef[];
  qty: number;
  unit: string;
  /** False when the unit was empty or unusable and the food's own unit was used. */
  unitRecognized: boolean;
  /** True when the quantity could not be read and 1 was used. */
  quantityGuessed: boolean;
  /** Slot id, or "" when the text did not say. */
  slot: string;
}

export { buildMatchIndex };

/**
 * Turn what the AI found into foods from the table with real quantities and units. The AI's words are
 * only used to find the food and the amount; calories and protein come later, from the table.
 */
export function resolveItems(
  items: ParsedItem[],
  index: MatchIndex,
  foods: ReadonlyMap<string, { unit: string }>,
): ResolvedItem[] {
  return items.map((parsed) => {
    const match = matchFood(parsed.name, index);
    const food = match ? foods.get(match.foodId) : undefined;
    if (!match || !food) {
      const n = parseQuantityWords(parsed.qty ?? 1);
      return {
        parsed, status: 'not_found', foodId: null, foodName: null, matchKind: null, alternatives: [],
        qty: n ?? 1, unit: parsed.unit, unitRecognized: false, quantityGuessed: n === null, slot: parsed.slot,
      };
    }
    const q = resolveQuantity(parsed.qty, parsed.unit, food);
    return {
      parsed, status: 'matched', foodId: match.foodId, foodName: match.foodName, matchKind: match.kind,
      alternatives: match.alternatives,
      qty: q.ok ? q.qty : 1, unit: q.ok ? q.unit : food.unit, unitRecognized: q.ok ? q.unitRecognized : false,
      quantityGuessed: !q.ok, slot: parsed.slot,
    };
  });
}
