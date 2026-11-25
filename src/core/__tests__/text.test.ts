import { normalizeName } from '../text';

describe('normalizeName', () => {
  it('ignores case and surrounding or repeated spaces', () => {
    expect(normalizeName('  Paneer  ')).toBe('paneer');
    expect(normalizeName('Dal   Makhani')).toBe('dal makhani');
  });
  it('turns punctuation into spaces and drops apostrophes', () => {
    expect(normalizeName('Dal-Makhani')).toBe('dal makhani');
    expect(normalizeName("Mom's  dal!")).toBe('moms dal');
  });
  it('keeps digits and Devanagari letters', () => {
    expect(normalizeName('2% Milk')).toBe('2 milk');
    expect(normalizeName('दही')).toBe('दही');
  });
});
