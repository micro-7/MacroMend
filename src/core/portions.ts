import { isGramUnit, validateUsualQty } from './staples';

/** Grams in common household measures (a katori can vary; these are the app's fixed values). */
export const HOUSEHOLD_GRAMS: Record<string, number> = {
  katori: 150,
  bowl: 250,
  cup: 240,
  glass: 250,
  tbsp: 15,
  tsp: 5,
};

export interface PortionFood {
  unit: string;
  gramsPerUnit: number;
}

export interface NutritionFood {
  kcalPer100g: number;
  proteinPer100g: number;
}

/** Units the user can pick for a food: its own unit first, then grams, then household measures. */
export function unitsFor(food: { unit: string }): string[] {
  const rest = ['g', ...Object.keys(HOUSEHOLD_GRAMS)].filter((u) => u !== food.unit);
  return [food.unit, ...rest];
}

/** Grams in one of `unit` for this food, or null for an unknown unit. */
export function gramsPerOne(food: PortionFood, unit: string): number | null {
  if (unit === food.unit) return food.gramsPerUnit;
  if (unit === 'g' || unit === 'ml') return 1;
  return HOUSEHOLD_GRAMS[unit] ?? null;
}

export function toGrams(food: PortionFood, qty: number, unit: string): number {
  const per = gramsPerOne(food, unit);
  if (per === null) throw new Error(`Unknown unit "${unit}"`);
  return qty * per;
}

/** Short hint for the unit picker, such as "≈ 150 g". Empty for plain grams. */
export function unitHint(food: PortionFood, unit: string): string {
  const per = gramsPerOne(food, unit);
  if (per === null || unit === 'g' || unit === 'ml') return '';
  return `≈ ${Math.round(per * 10) / 10} g`;
}

/** Unrounded kcal and protein for an amount of food. */
export function nutrition(food: NutritionFood, grams: number): { kcal: number; proteinG: number } {
  return {
    kcal: (grams * food.kcalPer100g) / 100,
    proteinG: (grams * food.proteinPer100g) / 100,
  };
}

/** Quantities must be above zero and at most 50 units or 5000 g. Returns a message or null. */
export function validateQty(qty: number, unit: string): string | null {
  return validateUsualQty(qty, isGramUnit(unit) ? 'g' : unit);
}

/** Display rounding: kcal as a whole number, protein with one decimal. */
export function formatKcal(kcal: number): string {
  return String(Math.round(kcal));
}

export function formatProtein(g: number): string {
  return (Math.round(g * 10) / 10).toFixed(1);
}

/**
 * Read a quantity typed by the user: "2", "0.5", "1,5", "1/2" or "1 1/2".
 * Returns NaN when it cannot be read.
 */
export function parseQty(text: string): number {
  const t = text.trim().replace(',', '.');
  if (t === '') return NaN;
  const mixed = /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = /^(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return /^\d*\.?\d+$/.test(t) ? Number(t) : NaN;
}
