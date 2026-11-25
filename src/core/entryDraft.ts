import { formatKcal, formatProtein, nutrition, parseQty, toGrams, validateQty } from './portions';

export interface EntryFood {
  unit: string;
  gramsPerUnit: number;
  kcalPer100g: number;
  proteinPer100g: number;
}

export type EntryPreview =
  | { ok: true; qty: number; grams: number; kcal: number; proteinG: number; text: string }
  | { ok: false; error: string };

/** What the entry form shows for the text typed so far: the numbers to be saved, or why it can't be saved yet. */
export function previewEntry(food: EntryFood, qtyText: string, unit: string): EntryPreview {
  const qty = parseQty(qtyText);
  const error = validateQty(qty, unit);
  if (error) return { ok: false, error };
  const grams = toGrams(food, qty, unit);
  const n = nutrition(food, grams);
  return {
    ok: true,
    qty,
    grams,
    kcal: n.kcal,
    proteinG: n.proteinG,
    text: `${formatKcal(n.kcal)} kcal · ${formatProtein(n.proteinG)} g protein (${Math.round(grams)} g)`,
  };
}
