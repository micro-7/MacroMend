import { normalizeName } from '../../../core/text';
import { ALL_FOODS, GLOBAL_FOODS, INDIAN_FOODS, USDA_FOODS } from '..';

const CATEGORIES = ['veg', 'egg', 'non-veg', 'vegan'];

describe('bundled food data', () => {
  it('has at least 150 Indian and 150 global foods', () => {
    expect(INDIAN_FOODS.length).toBeGreaterThanOrEqual(150);
    expect(USDA_FOODS.length + GLOBAL_FOODS.length).toBeGreaterThanOrEqual(150);
  });

  it('has unique ids', () => {
    const ids = ALL_FOODS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never uses the same name or alias for two different foods', () => {
    const owner = new Map<string, string>();
    const clashes: string[] = [];
    for (const f of ALL_FOODS) {
      for (const n of new Set([f.name, ...f.aliases].map(normalizeName))) {
        const prev = owner.get(n);
        if (prev && prev !== f.id) clashes.push(`"${n}": ${prev} vs ${f.id}`);
        owner.set(n, f.id);
      }
    }
    expect(clashes).toEqual([]);
  });

  it('has valid fields and plausible numbers for every food', () => {
    const problems: string[] = [];
    for (const f of ALL_FOODS) {
      if (!f.name.trim()) problems.push(`${f.id}: empty name`);
      if (!CATEGORIES.includes(f.category)) problems.push(`${f.id}: bad category`);
      if (!f.unit) problems.push(`${f.id}: no unit`);
      if (!(f.gramsPerUnit > 0)) problems.push(`${f.id}: grams per unit`);
      if (f.kcalPer100g < 0 || f.kcalPer100g > 900) problems.push(`${f.id}: kcal ${f.kcalPer100g}`);
      if (f.proteinPer100g < 0 || f.proteinPer100g > 100) problems.push(`${f.id}: protein ${f.proteinPer100g}`);
      // Protein supplies 4 kcal/g, so it cannot exceed the food's energy (5% tolerance).
      if (f.proteinPer100g * 4 > f.kcalPer100g * 1.05 + 1) problems.push(`${f.id}: protein x4 > kcal`);
      if (f.source === 'usda' && !f.externalId?.startsWith('fdc:')) problems.push(`${f.id}: usda row without fdc id`);
    }
    expect(problems).toEqual([]);
  });

  it('covers every diet category', () => {
    for (const c of CATEGORIES) expect(ALL_FOODS.some((f) => f.category === c)).toBe(true);
  });
});
