import { DEFAULT_SLOTS } from '../../core/slots';
import { EMPTY_TARGETS_DRAFT } from '../../core/targetsDraft';
import type { FoodRow } from '../../db/foods';
import { buildProfile, buildStaples, type ProfileDraft, type StapleDraft } from '../buildProfile';

const calculating: ProfileDraft = {
  goal: 'cut',
  dietType: 'veg',
  slots: DEFAULT_SLOTS,
  targets: { ...EMPTY_TARGETS_DRAFT, weightKg: '75', heightCm: '175', age: '30', sex: 'male', activity: 'moderate' },
};

const food = (over: Partial<FoodRow> = {}): FoodRow => ({
  id: 'in-roti', name: 'roti', aliases: [], category: 'vegan', unit: 'piece', gramsPerUnit: 40,
  kcalPer100g: 297, proteinPer100g: 9.8, source: 'built-in', externalId: null, ...over,
});

describe('buildProfile', () => {
  it('builds a profile from calculated targets and keeps the body details', () => {
    const r = buildProfile(calculating);
    expect(r).toEqual({
      ok: true,
      value: {
        name: null, goal: 'cut', dietType: 'veg', weightKg: 75, heightCm: 175, age: 30, sex: 'male', activity: 'moderate',
        kcalTarget: 2110, proteinTargetG: 150, slots: DEFAULT_SLOTS,
      },
    });
  });

  it('keeps a trimmed name, and no name when it is blank', () => {
    expect(buildProfile({ ...calculating, name: '  Mihir ' })).toMatchObject({ ok: true, value: { name: 'Mihir' } });
    expect(buildProfile({ ...calculating, name: '   ' })).toMatchObject({ ok: true, value: { name: null } });
    expect(buildProfile({ ...calculating, name: 'x'.repeat(40) })).toMatchObject({ ok: true, value: { name: 'x'.repeat(30) } });
  });

  it('uses typed targets and stores null body details when none were given', () => {
    const r = buildProfile({ ...calculating, targets: { ...EMPTY_TARGETS_DRAFT, mode: 'type', kcal: '1800', protein: '120' } });
    expect(r.ok && r.value.kcalTarget).toBe(1800);
    expect(r.ok && r.value.weightKg).toBeNull();
    expect(r.ok && r.value.sex).toBeNull();
  });

  it('fails without a goal, a diet type or valid targets', () => {
    expect(buildProfile({ ...calculating, goal: null }).ok).toBe(false);
    expect(buildProfile({ ...calculating, dietType: null }).ok).toBe(false);
    expect(buildProfile({ ...calculating, targets: { ...EMPTY_TARGETS_DRAFT, mode: 'type', kcal: '500', protein: '120' } }).ok).toBe(false);
  });
});

describe('buildStaples', () => {
  it('converts valid drafts', () => {
    const drafts: StapleDraft[] = [{ food: food(), qty: '3' }];
    expect(buildStaples(drafts)).toEqual({ ok: true, value: [{ foodId: 'in-roti', usualQty: 3, usualUnit: 'piece' }] });
  });

  it('names the food with a bad quantity', () => {
    const r = buildStaples([{ food: food(), qty: '0' }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/^roti:/);
    expect(buildStaples([{ food: food(), qty: '' }]).ok).toBe(false);
  });

  it('accepts an empty list', () => {
    expect(buildStaples([])).toEqual({ ok: true, value: [] });
  });
});
