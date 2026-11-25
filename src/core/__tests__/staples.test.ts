import { defaultUsualQty, validateUsualQty } from '../staples';

describe('usual quantity', () => {
  it('defaults to 100 g for gram foods and one unit otherwise', () => {
    expect(defaultUsualQty('g')).toBe(100);
    expect(defaultUsualQty('piece')).toBe(1);
    expect(defaultUsualQty('scoop')).toBe(1);
  });

  it('validates range per unit type', () => {
    expect(validateUsualQty(3, 'piece')).toBeNull();
    expect(validateUsualQty(0, 'piece')).not.toBeNull();
    expect(validateUsualQty(51, 'piece')).not.toBeNull();
    expect(validateUsualQty(5000, 'g')).toBeNull();
    expect(validateUsualQty(5001, 'g')).not.toBeNull();
    expect(validateUsualQty(NaN, 'g')).not.toBeNull();
  });
});
