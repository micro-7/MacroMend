export type FoodCategory = 'veg' | 'egg' | 'non-veg' | 'vegan';
export type FoodSource = 'built-in' | 'usda' | 'openfoodfacts' | 'user' | 'ai-estimated';

/** A food shipped inside the app. Numbers are per 100 g. */
export interface FoodSeed {
  id: string;
  name: string;
  aliases: string[];
  category: FoodCategory;
  /** The unit people count this food in (piece, katori, scoop, g, ...). */
  unit: string;
  gramsPerUnit: number;
  kcalPer100g: number;
  proteinPer100g: number;
  source: 'built-in' | 'usda';
  /** USDA FoodData Central id, for rows taken from FDC. */
  externalId?: string;
}

/** [slug, name, aliases separated by |, category, unit, gramsPerUnit, kcal/100g, protein/100g] */
export type SeedRow = [string, string, string, FoodCategory, string, number, number, number];

export function seedsFromRows(prefix: string, rows: SeedRow[]): FoodSeed[] {
  return rows.map(([slug, name, aliases, category, unit, gramsPerUnit, kcal, protein]) => ({
    id: `${prefix}-${slug}`,
    name,
    aliases: aliases ? aliases.split('|') : [],
    category,
    unit,
    gramsPerUnit,
    kcalPer100g: kcal,
    proteinPer100g: protein,
    source: 'built-in' as const,
  }));
}
