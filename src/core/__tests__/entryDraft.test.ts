import { previewEntry } from '../entryDraft';

const roti = { unit: 'piece', gramsPerUnit: 40, kcalPer100g: 297, proteinPer100g: 9.8 };
const whey = { unit: 'scoop', gramsPerUnit: 30, kcalPer100g: 400, proteinPer100g: 80 };
const dal = { unit: 'katori', gramsPerUnit: 150, kcalPer100g: 90, proteinPer100g: 5.5 };

describe('previewEntry', () => {
  it('shows 2 roti as about 238 kcal and 7.8 g protein (80 g)', () => {
    const p = previewEntry(roti, '2', 'piece');
    expect(p).toMatchObject({ ok: true, grams: 80 });
    expect(p.ok && p.text).toBe('238 kcal · 7.8 g protein (80 g)');
  });

  it('shows 1 katori of dal as about 150 g', () => {
    const p = previewEntry(dal, '1', 'katori');
    expect(p.ok && p.grams).toBe(150);
    expect(p.ok && p.text).toContain('(150 g)');
  });

  it('accepts half a scoop typed as 0.5 or 1/2', () => {
    for (const t of ['0.5', '1/2']) {
      const p = previewEntry(whey, t, 'scoop');
      expect(p.ok && p.grams).toBe(15);
      expect(p.ok && p.text).toBe('60 kcal · 12.0 g protein (15 g)');
    }
  });

  it('is not saveable for zero, empty, text or too large amounts', () => {
    for (const t of ['0', '', 'abc', '51']) expect(previewEntry(roti, t, 'piece').ok).toBe(false);
    expect(previewEntry(roti, '0', 'piece')).toMatchObject({ ok: false, error: expect.stringMatching(/above zero/) });
  });
});
