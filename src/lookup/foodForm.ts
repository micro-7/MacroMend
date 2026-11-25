import type { FoodCategory } from '../core/diet';
import { parseQty } from '../core/portions';
import type { FoodRow } from '../db/foods';
import { checkNutrition } from '../db/userFoods';
import type { FoodEstimate } from './estimate';

/** A food while it is being typed or checked: numbers are still text. */
export interface FoodFormValues {
  name: string;
  kcal: string;
  protein: string;
  category: FoodCategory | null;
  unit: string;
  gramsPerUnit: string;
}

export const EMPTY_FOOD_FORM: FoodFormValues = { name: '', kcal: '', protein: '', category: null, unit: 'g', gramsPerUnit: '1' };

export const fromEstimate = (e: FoodEstimate): FoodFormValues => ({
  name: e.name, kcal: String(e.kcalPer100g), protein: String(e.proteinPer100g), category: e.category, unit: e.unit, gramsPerUnit: String(e.gramsPerUnit),
});

export const fromFood = (f: FoodRow): FoodFormValues => ({
  name: f.name, kcal: String(f.kcalPer100g), protein: String(f.proteinPer100g), category: f.category, unit: f.unit, gramsPerUnit: String(f.gramsPerUnit),
});

export type FoodFormErrors = Partial<Record<keyof FoodFormValues, string>>;

export interface FoodFormParsed {
  name: string;
  category: FoodCategory;
  unit: string;
  gramsPerUnit: number;
  kcalPer100g: number;
  proteinPer100g: number;
}

const num = (t: string): number => (t.trim() === '' ? NaN : Number(t.trim().replace(',', '.')));

/** Check the form. Returns the parsed food, or a message per field. */
export function validateFoodForm(v: FoodFormValues): { ok: true; food: FoodFormParsed } | { ok: false; errors: FoodFormErrors } {
  const errors: FoodFormErrors = {};
  if (!v.name.trim()) errors.name = 'Give the food a name.';
  const kcal = num(v.kcal);
  const protein = num(v.protein);
  const bad = checkNutrition(kcal, protein);
  if (bad) {
    if (!Number.isFinite(kcal) || kcal < 0 || kcal > 900) errors.kcal = bad;
    else errors.protein = bad;
  }
  if (!v.category) errors.category = 'Choose a category.';
  const unit = v.unit.trim() || 'g';
  const grams = unit === 'g' ? 1 : num(v.gramsPerUnit);
  if (unit !== 'g' && !(grams > 0 && grams <= 2000)) errors.gramsPerUnit = 'Enter the weight of one unit in grams (up to 2000).';
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, food: { name: v.name.trim(), category: v.category!, unit, gramsPerUnit: grams, kcalPer100g: kcal, proteinPer100g: protein } };
}

export { parseQty };
