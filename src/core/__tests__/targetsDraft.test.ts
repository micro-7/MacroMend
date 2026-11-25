import { EMPTY_TARGETS_DRAFT, resolveTargets, type TargetsDraft } from '../targetsDraft';

const calc = (over: Partial<TargetsDraft> = {}): TargetsDraft => ({
  ...EMPTY_TARGETS_DRAFT,
  weightKg: '75',
  heightCm: '175',
  age: '30',
  sex: 'male',
  activity: 'moderate',
  ...over,
});

describe('resolveTargets', () => {
  it('uses typed numbers when valid', () => {
    const r = resolveTargets({ ...EMPTY_TARGETS_DRAFT, mode: 'type', kcal: '1800', protein: '120' }, 'cut');
    expect(r).toEqual({ ok: true, kcal: 1800, proteinG: 120, note: null });
  });

  it('blocks out-of-range typed numbers with a message per field', () => {
    const r = resolveTargets({ ...EMPTY_TARGETS_DRAFT, mode: 'type', kcal: '500', protein: '500' }, 'cut');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.kcal).toMatch(/800/);
      expect(r.errors.protein).toMatch(/400/);
    }
  });

  it('calculates from body details (spec example, cut)', () => {
    expect(resolveTargets(calc(), 'cut')).toEqual({ ok: true, kcal: 2110, proteinG: 150, note: null });
  });

  it('asks for every missing body field', () => {
    const r = resolveTargets({ ...EMPTY_TARGETS_DRAFT }, 'maintain');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['activity', 'age', 'heightCm', 'sex', 'weightKg']);
  });

  it('rejects an unrealistic weight', () => {
    const r = resolveTargets(calc({ weightKg: '5' }), 'maintain');
    expect(r.ok).toBe(false);
  });

  it('adds a note when the safe minimum applies', () => {
    const r = resolveTargets(calc({ weightKg: '45', heightCm: '150', age: '50', sex: 'female', activity: 'sedentary' }), 'cut');
    expect(r).toEqual({ ok: true, kcal: 1200, proteinG: 90, note: 'Raised to the 1200 kcal safe minimum.' });
  });
});
