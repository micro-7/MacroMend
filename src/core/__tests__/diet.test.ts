import { allowedCategories, isAllowed } from '../diet';

describe('diet filter', () => {
  it('maps each diet type to its allowed categories', () => {
    expect(allowedCategories('vegan')).toEqual(['vegan']);
    expect(allowedCategories('veg')).toEqual(['vegan', 'veg']);
    expect(allowedCategories('eggetarian')).toEqual(['vegan', 'veg', 'egg']);
    expect(allowedCategories('non-veg')).toEqual(['vegan', 'veg', 'egg', 'non-veg']);
  });

  it('checks single foods (eggetarian allows paneer and eggs, not chicken)', () => {
    expect(isAllowed({ category: 'veg' }, 'eggetarian')).toBe(true);
    expect(isAllowed({ category: 'egg' }, 'eggetarian')).toBe(true);
    expect(isAllowed({ category: 'non-veg' }, 'eggetarian')).toBe(false);
    expect(isAllowed({ category: 'egg' }, 'veg')).toBe(false);
    expect(isAllowed({ category: 'veg' }, 'vegan')).toBe(false);
    expect(isAllowed({ category: 'non-veg' }, 'non-veg')).toBe(true);
  });
});
