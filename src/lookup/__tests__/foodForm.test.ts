import { EMPTY_FOOD_FORM, fromEstimate, fromFood, validateFoodForm, type FoodFormValues } from '../foodForm';

const ok: FoodFormValues = { name: 'Butter chicken', kcal: '170', protein: '12', category: 'non-veg', unit: 'plate', gramsPerUnit: '300' };

describe('validateFoodForm', () => {
  it('parses a valid form', () => {
    expect(validateFoodForm(ok)).toEqual({
      ok: true,
      food: { name: 'Butter chicken', category: 'non-veg', unit: 'plate', gramsPerUnit: 300, kcalPer100g: 170, proteinPer100g: 12 },
    });
  });

  it('uses 1 g per unit when the unit is grams and accepts a comma as the decimal point', () => {
    const r = validateFoodForm({ ...ok, unit: 'g', gramsPerUnit: 'whatever', kcal: '170,5' });
    expect(r).toMatchObject({ ok: true, food: { unit: 'g', gramsPerUnit: 1, kcalPer100g: 170.5 } });
    expect(validateFoodForm({ ...ok, unit: '  ' })).toMatchObject({ ok: true, food: { unit: 'g', gramsPerUnit: 1 } });
  });

  it('asks for everything that is missing', () => {
    const r = validateFoodForm(EMPTY_FOOD_FORM);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['category', 'kcal', 'name']);
  });

  it('refuses numbers that cannot be right, and points at the field', () => {
    const tooMuchProtein = validateFoodForm({ ...ok, kcal: '50', protein: '40' });
    expect(tooMuchProtein.ok === false && tooMuchProtein.errors.protein).toMatch(/doesn't fit/);
    const tooManyKcal = validateFoodForm({ ...ok, kcal: '1000' });
    expect(tooManyKcal.ok === false && tooManyKcal.errors.kcal).toMatch(/between 0 and 900/);
    expect(validateFoodForm({ ...ok, kcal: 'abc' }).ok).toBe(false);
  });

  it('needs a sensible weight for non-gram units', () => {
    for (const g of ['', '0', '-5', '5000', 'x']) {
      const r = validateFoodForm({ ...ok, gramsPerUnit: g });
      expect(r.ok === false && r.errors.gramsPerUnit).toBeDefined();
    }
  });
});

describe('form starting values', () => {
  it('starts from an AI estimate or a saved food', () => {
    expect(fromEstimate({ name: 'Dal', kcalPer100g: 90, proteinPer100g: 5.5, unit: 'katori', gramsPerUnit: 150, category: 'vegan' })).toEqual({
      name: 'Dal', kcal: '90', protein: '5.5', category: 'vegan', unit: 'katori', gramsPerUnit: '150',
    });
    expect(fromFood({ id: 'x', name: 'Mine', aliases: [], category: 'veg', unit: 'g', gramsPerUnit: 1, kcalPer100g: 100, proteinPer100g: 5, source: 'user', externalId: null })).toMatchObject({ name: 'Mine', kcal: '100' });
  });
});
