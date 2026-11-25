import type { FoodRef, MatchKind } from '../core/match';
import { previewEntry, type EntryFood, type EntryPreview } from '../core/entryDraft';
import { normalizeUnit } from '../core/quantityWords';
import type { ResolvedItem } from './resolve';
import type { ParsedItem } from './types';

/** One line of the confirm list while the user checks and edits it. */
export interface ConfirmItem {
  key: string;
  parsed: ParsedItem;
  foodId: string | null;
  matchKind: MatchKind | null;
  alternatives: FoodRef[];
  qtyText: string;
  unit: string;
  /** Slot id the entry will go to. */
  slot: string;
  unitRecognized: boolean;
  quantityGuessed: boolean;
}

export type ConfirmFood = EntryFood & { id: string; name: string };

const qtyString = (n: number) => String(Math.round(n * 100) / 100);

/** Build the confirm list. Items without a meal go to `defaultSlot`; a meal the user no longer has does too. */
export function toConfirmItems(resolved: ResolvedItem[], defaultSlot: string, slotIds: string[]): ConfirmItem[] {
  return resolved.map((r, i) => ({
    key: `item-${i}`,
    parsed: r.parsed,
    foodId: r.foodId,
    matchKind: r.matchKind,
    alternatives: r.alternatives,
    qtyText: qtyString(r.qty),
    unit: r.unit,
    slot: slotIds.includes(r.slot) ? r.slot : defaultSlot,
    unitRecognized: r.unitRecognized,
    quantityGuessed: r.quantityGuessed,
  }));
}

/** Point an item at another food (an alternative, or one picked by hand), keeping the amount and fixing the unit. */
export function withFood(item: ConfirmItem, food: ConfirmFood): ConfirmItem {
  const u = normalizeUnit(item.parsed.unit, food);
  const others = item.alternatives.filter((a) => a.foodId !== food.id);
  return { ...item, foodId: food.id, matchKind: 'exact', alternatives: others, unit: u.unit, unitRecognized: u.recognized };
}

export interface ReadyEntry {
  item: ConfirmItem;
  foodId: string;
  qty: number;
  unit: string;
  preview: Extract<EntryPreview, { ok: true }>;
}

/**
 * Split the list into entries that can be logged now and items that still need the user:
 * no food found, or an amount that is not valid.
 */
export function splitReady(
  items: ConfirmItem[],
  foods: ReadonlyMap<string, ConfirmFood>,
): { ready: ReadyEntry[]; pending: ConfirmItem[] } {
  const ready: ReadyEntry[] = [];
  const pending: ConfirmItem[] = [];
  for (const item of items) {
    const food = item.foodId ? foods.get(item.foodId) : undefined;
    if (!food) {
      pending.push(item);
      continue;
    }
    const preview = previewEntry(food, item.qtyText, item.unit);
    if (!preview.ok) pending.push(item);
    else ready.push({ item, foodId: food.id, qty: preview.qty, unit: item.unit, preview });
  }
  return { ready, pending };
}
