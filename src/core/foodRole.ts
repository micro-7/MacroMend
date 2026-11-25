/** A food counts as a protein food when at least this share of its energy comes from protein. */
export const PROTEIN_FOOD_THRESHOLD = 0.2;

export interface Nutrition {
  kcalPer100g: number;
  proteinPer100g: number;
}

/** Share of a food's energy that comes from protein (protein grams x 4 kcal), from 0 to 1. */
export function proteinEnergyShare(f: Nutrition): number {
  if (f.kcalPer100g <= 0) return 0;
  return Math.min(1, (f.proteinPer100g * 4) / f.kcalPer100g);
}

export function isProteinFood(f: Nutrition): boolean {
  return proteinEnergyShare(f) >= PROTEIN_FOOD_THRESHOLD;
}
