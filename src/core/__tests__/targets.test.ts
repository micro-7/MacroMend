import { bmr, calculateTargets, validateKcal, validateProtein, type BodyDetails } from '../targets';

const man: BodyDetails = { weightKg: 75, heightCm: 175, age: 30, sex: 'male', activity: 'moderate' };

describe('calculateTargets', () => {
  it('computes BMR with Mifflin-St Jeor', () => {
    expect(bmr(man)).toBeCloseTo(1698.75, 2);
    expect(bmr({ ...man, sex: 'female' })).toBeCloseTo(1532.75, 2);
  });

  it('matches the spec example for maintain', () => {
    expect(calculateTargets(man, 'maintain')).toEqual({ kcal: 2630, proteinG: 120, raisedToFloor: false });
  });

  it('adjusts kcal and protein for cut and bulk', () => {
    expect(calculateTargets(man, 'cut')).toEqual({ kcal: 2110, proteinG: 150, raisedToFloor: false });
    expect(calculateTargets(man, 'bulk')).toEqual({ kcal: 2900, proteinG: 135, raisedToFloor: false });
  });

  it('works for a woman and rounds protein to 5 g', () => {
    const woman: BodyDetails = { weightKg: 60, heightCm: 160, age: 25, sex: 'female', activity: 'light' };
    // BMR 1314 x 1.375 = 1806.75 -> 1810 kcal; 1.6 x 60 = 96 -> 95 g
    expect(calculateTargets(woman, 'maintain')).toEqual({ kcal: 1810, proteinG: 95, raisedToFloor: false });
  });

  it('never goes below 1200 kcal and says when it raised the number', () => {
    const small: BodyDetails = { weightKg: 45, heightCm: 150, age: 50, sex: 'female', activity: 'sedentary' };
    expect(calculateTargets(small, 'cut')).toEqual({ kcal: 1200, proteinG: 90, raisedToFloor: true });
  });
});

describe('typed target validation', () => {
  it('accepts values in range and rejects the rest', () => {
    expect(validateKcal(1800)).toBeNull();
    expect(validateKcal(799)).not.toBeNull();
    expect(validateKcal(6001)).not.toBeNull();
    expect(validateKcal(NaN)).not.toBeNull();
    expect(validateProtein(120)).toBeNull();
    expect(validateProtein(19)).not.toBeNull();
    expect(validateProtein(401)).not.toBeNull();
  });
});
