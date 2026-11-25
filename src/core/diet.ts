export type DietType = 'veg' | 'eggetarian' | 'non-veg' | 'vegan';
export type FoodCategory = 'veg' | 'egg' | 'non-veg' | 'vegan';

export const DIET_TYPES: DietType[] = ['veg', 'eggetarian', 'non-veg', 'vegan'];

export const DIET_LABELS: Record<DietType, string> = {
  veg: 'Vegetarian',
  eggetarian: 'Eggetarian',
  'non-veg': 'Non-vegetarian',
  vegan: 'Vegan',
};

/** Food categories each diet type allows. Used for suggestions and picker defaults, never to block logging. */
export function allowedCategories(diet: DietType): FoodCategory[] {
  switch (diet) {
    case 'vegan':
      return ['vegan'];
    case 'veg':
      return ['vegan', 'veg'];
    case 'eggetarian':
      return ['vegan', 'veg', 'egg'];
    case 'non-veg':
      return ['vegan', 'veg', 'egg', 'non-veg'];
  }
}

export function isAllowed(food: { category: FoodCategory }, diet: DietType): boolean {
  return allowedCategories(diet).includes(food.category);
}
