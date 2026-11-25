import { formatKcal, formatProtein, gramsPerOne, nutrition, parseQty, toGrams, unitHint, unitsFor, validateQty } from '../portions';

const roti = { unit: 'piece', gramsPerUnit: 40, kcalPer100g: 297, proteinPer100g: 9.8 };
const paneer = { unit: 'g', gramsPerUnit: 1, kcalPer100g: 265, proteinPer100g: 18.3 };
const whey = { unit: 'scoop', gramsPerUnit: 30, kcalPer100g: 400, proteinPer100g: 80 };

describe('units and grams', () => {
  it('offers the food unit first, then grams and household measures', () => {
    expect(unitsFor(roti)).toEqual(['piece', 'g', 'katori', 'bowl', 'cup', 'glass', 'tbsp', 'tsp']);
    expect(unitsFor(paneer)).toEqual(['g', 'katori', 'bowl', 'cup', 'glass', 'tbsp', 'tsp']);
  });

  it('converts to grams (2 roti = 80 g, 1 katori = 150 g)', () => {
    expect(toGrams(roti, 2, 'piece')).toBe(80);
    expect(toGrams(roti, 1, 'katori')).toBe(150);
    expect(toGrams(paneer, 150, 'g')).toBe(150);
    expect(toGrams(roti, 1, 'bowl')).toBe(250);
    expect(toGrams(roti, 2, 'tbsp')).toBe(30);
    expect(toGrams(roti, 100, 'ml')).toBe(100);
  });

  it("uses the food's own unit weight even when it shares a household name", () => {
    const chai = { unit: 'cup', gramsPerUnit: 150 };
    expect(toGrams(chai, 1, 'cup')).toBe(150);
    expect(toGrams(chai, 1, 'glass')).toBe(250);
  });

  it('rejects an unknown unit', () => {
    expect(() => toGrams(roti, 1, 'plate')).toThrow(/Unknown unit/);
    expect(gramsPerOne(roti, 'plate')).toBeNull();
  });

  it('shows gram hints for measures but not for plain grams', () => {
    expect(unitHint(roti, 'katori')).toBe('≈ 150 g');
    expect(unitHint(roti, 'piece')).toBe('≈ 40 g');
    expect(unitHint(roti, 'g')).toBe('');
  });
});

describe('nutrition', () => {
  it('computes 150 g paneer as 398 kcal and 27.5 g protein', () => {
    const n = nutrition(paneer, 150);
    expect(formatKcal(n.kcal)).toBe('398');
    expect(formatProtein(n.proteinG)).toBe('27.5');
  });

  it('halves a scoop of whey', () => {
    const n = nutrition(whey, toGrams(whey, 0.5, 'scoop'));
    expect(toGrams(whey, 0.5, 'scoop')).toBe(15);
    expect(formatKcal(n.kcal)).toBe('60');
    expect(formatProtein(n.proteinG)).toBe('12.0');
  });
});

describe('validateQty', () => {
  it('rejects zero, negatives and values over the limits', () => {
    expect(validateQty(0, 'piece')).not.toBeNull();
    expect(validateQty(-1, 'piece')).not.toBeNull();
    expect(validateQty(51, 'piece')).not.toBeNull();
    expect(validateQty(50, 'piece')).toBeNull();
    expect(validateQty(5001, 'g')).not.toBeNull();
    expect(validateQty(5000, 'g')).toBeNull();
    expect(validateQty(5001, 'ml')).not.toBeNull();
    expect(validateQty(NaN, 'piece')).not.toBeNull();
  });

  it('allows fractions', () => {
    expect(validateQty(0.5, 'scoop')).toBeNull();
    expect(validateQty(1.5, 'piece')).toBeNull();
  });
});

describe('parseQty', () => {
  it('reads decimals, comma decimals and fractions', () => {
    expect(parseQty('2')).toBe(2);
    expect(parseQty('0.5')).toBe(0.5);
    expect(parseQty('.5')).toBe(0.5);
    expect(parseQty('1,5')).toBe(1.5);
    expect(parseQty('1/2')).toBe(0.5);
    expect(parseQty('1 1/2')).toBe(1.5);
    expect(parseQty(' 3/4 ')).toBe(0.75);
  });

  it('returns NaN for anything else', () => {
    for (const bad of ['', 'abc', '1..2', '1/0x', '-1', '1e3']) expect(Number.isNaN(parseQty(bad))).toBe(true);
  });
});
