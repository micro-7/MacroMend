import { ALL_FOODS } from '../../data/foods';
import { isProteinFood, proteinEnergyShare } from '../foodRole';

const food = (id: string) => {
  const f = ALL_FOODS.find((x) => x.id === id);
  if (!f) throw new Error(`missing food ${id}`);
  return f;
};

describe('foodRole', () => {
  it('treats paneer, whey, dal, eggs and curd as protein foods', () => {
    for (const id of ['in-paneer', 'in-whey', 'in-dal', 'usda-egg', 'in-curd', 'in-moong-dal']) {
      expect(isProteinFood(food(id))).toBe(true);
    }
  });

  it('treats roti, rice, oats and oil as carb or other foods', () => {
    for (const id of ['in-roti', 'in-rice', 'usda-oats', 'in-oil', 'in-ghee']) {
      expect(isProteinFood(food(id))).toBe(false);
    }
  });

  it('handles zero energy and caps the share at 1', () => {
    expect(proteinEnergyShare({ kcalPer100g: 0, proteinPer100g: 5 })).toBe(0);
    expect(proteinEnergyShare({ kcalPer100g: 100, proteinPer100g: 50 })).toBe(1);
  });
});
