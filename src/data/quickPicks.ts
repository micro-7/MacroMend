import type { DietType } from '../core/diet';

/** Popular staples shown first in the picker. Ids that are not in the catalog are skipped by the picker. */
const VEG = [
  'in-paneer', 'in-dal', 'in-roti', 'in-curd', 'in-whey', 'in-rice',
  'in-soya-chunks', 'in-moong-dal', 'in-chole', 'in-rajma', 'usda-oats', 'usda-banana',
];

export const QUICK_PICKS: Record<DietType, string[]> = {
  veg: VEG,
  eggetarian: ['usda-egg', 'usda-egg-white', ...VEG],
  'non-veg': ['usda-chicken-breast', 'usda-egg', 'g-salmon', 'usda-tuna-canned', ...VEG],
  vegan: [
    'g-tofu', 'in-soya-chunks', 'in-plant-protein', 'in-dal', 'in-moong-dal', 'in-chole',
    'in-rajma', 'in-roti', 'in-rice', 'usda-oats', 'usda-peanut-butter', 'usda-banana',
  ],
};
