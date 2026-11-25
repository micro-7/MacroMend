import { normalizeUnit, parseQuantityWords, resolveQuantity } from '../quantityWords';

describe('parseQuantityWords', () => {
  it.each([
    ['ek', 1], ['do', 2], ['teen', 3], ['char', 4], ['paanch', 5], ['chhe', 6], ['saat', 7], ['aath', 8], ['nau', 9], ['das', 10],
    ['aadha', 0.5], ['dedh', 1.5], ['dhai', 2.5], ['sawa', 1.25],
  ])('reads Hinglish word "%s"', (word, n) => {
    expect(parseQuantityWords(word)).toBe(n);
  });

  it.each([
    ['one', 1], ['two', 2], ['three', 3], ['ten', 10], ['half', 0.5], ['a', 1], ['an', 1], ['quarter', 0.25],
  ])('reads English word "%s"', (word, n) => {
    expect(parseQuantityWords(word)).toBe(n);
  });

  it('reads spelling variants', () => {
    expect(parseQuantityWords('Teen')).toBe(3);
    expect(parseQuantityWords('panch')).toBe(5);
    expect(parseQuantityWords('adha')).toBe(0.5);
    expect(parseQuantityWords('derh')).toBe(1.5);
  });

  it('reads sawa and saadhe as 0.25 and 0.5 more than the next number', () => {
    expect(parseQuantityWords('sawa ek')).toBe(1.25);
    expect(parseQuantityWords('sawa do')).toBe(2.25);
    expect(parseQuantityWords('saadhe teen')).toBe(3.5);
    expect(parseQuantityWords('saade char')).toBe(4.5);
  });

  it('reads "and a half" and fractions and digits', () => {
    expect(parseQuantityWords('one and a half')).toBe(1.5);
    expect(parseQuantityWords('two and half')).toBe(2.5);
    expect(parseQuantityWords('1/2')).toBe(0.5);
    expect(parseQuantityWords('2')).toBe(2);
    expect(parseQuantityWords('1.5')).toBe(1.5);
    expect(parseQuantityWords(3)).toBe(3);
  });

  it('returns null for things that are not quantities', () => {
    for (const bad of ['', 'lots', 'saadhe', 'sawa kuch', 'zero', '0', -1]) {
      expect(parseQuantityWords(bad as string | number)).toBeNull();
    }
  });
});

describe('normalizeUnit', () => {
  const roti = { unit: 'piece' };
  const paneer = { unit: 'g' };
  const whey = { unit: 'scoop' };

  it('maps piece words to the food\'s own counting unit', () => {
    for (const w of ['pc', 'pcs', 'piece', 'pieces', 'nos']) expect(normalizeUnit(w, roti)).toEqual({ unit: 'piece', recognized: true });
    expect(normalizeUnit('pcs', { unit: 'slice' })).toEqual({ unit: 'slice', recognized: true });
  });

  it('maps gram spellings', () => {
    for (const w of ['g', 'gm', 'gms', 'gram', 'grams']) expect(normalizeUnit(w, paneer)).toEqual({ unit: 'g', recognized: true });
    expect(normalizeUnit('gms', roti)).toEqual({ unit: 'g', recognized: true });
  });

  it('maps household measures', () => {
    expect(normalizeUnit('katoris', roti)).toEqual({ unit: 'katori', recognized: true });
    expect(normalizeUnit('Bowl', roti)).toEqual({ unit: 'bowl', recognized: true });
    expect(normalizeUnit('cups', roti)).toEqual({ unit: 'cup', recognized: true });
    expect(normalizeUnit('glasses', roti)).toEqual({ unit: 'glass', recognized: true });
    expect(normalizeUnit('tablespoon', roti)).toEqual({ unit: 'tbsp', recognized: true });
    expect(normalizeUnit('tsp', roti)).toEqual({ unit: 'tsp', recognized: true });
    expect(normalizeUnit('scoops', whey)).toEqual({ unit: 'scoop', recognized: true });
  });

  it('uses the food\'s default unit for unknown, empty or unusable units', () => {
    expect(normalizeUnit('plate', { unit: 'piece' })).toEqual({ unit: 'piece', recognized: false });
    expect(normalizeUnit('', roti)).toEqual({ unit: 'piece', recognized: false });
    expect(normalizeUnit(undefined, whey)).toEqual({ unit: 'scoop', recognized: false });
    expect(normalizeUnit('scoop', roti)).toEqual({ unit: 'piece', recognized: false });
  });

  it('flags a piece word used for a gram food as not recognised', () => {
    expect(normalizeUnit('pcs', paneer)).toEqual({ unit: 'g', recognized: false });
  });
});

describe('resolveQuantity', () => {
  it('turns "ek" + "katori" into 1 katori', () => {
    expect(resolveQuantity('ek', 'katori', { unit: 'katori' })).toEqual({ ok: true, qty: 1, unit: 'katori', unitRecognized: true });
  });

  it('turns "do" into 2 and "dedh" into 1.5', () => {
    expect(resolveQuantity('do', '', { unit: 'piece' })).toMatchObject({ qty: 2, unit: 'piece' });
    expect(resolveQuantity('dedh', 'katori', { unit: 'piece' })).toMatchObject({ qty: 1.5, unit: 'katori' });
  });

  it('defaults a missing quantity to 1', () => {
    expect(resolveQuantity(undefined, undefined, { unit: 'piece' })).toMatchObject({ ok: true, qty: 1 });
    expect(resolveQuantity('', 'g', { unit: 'g' })).toMatchObject({ ok: true, qty: 1, unit: 'g' });
  });

  it('keeps numbers as they are and fails on words it cannot read', () => {
    expect(resolveQuantity(2, 'pcs', { unit: 'piece' })).toMatchObject({ ok: true, qty: 2 });
    expect(resolveQuantity('plenty', 'g', { unit: 'g' })).toMatchObject({ ok: false });
  });

  it('uses the food\'s default unit when the unit is unknown (samosa on a plate)', () => {
    expect(resolveQuantity(2, 'plate', { unit: 'piece' })).toEqual({ ok: true, qty: 2, unit: 'piece', unitRecognized: false });
  });
});
