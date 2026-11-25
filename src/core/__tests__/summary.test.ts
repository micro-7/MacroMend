import { DEFAULT_SLOTS } from '../slots';
import { mealProgress, summarize } from '../summary';

const log = (slot: string, kcal: number, proteinG: number) => ({ slot, kcal, proteinG });
const targets = { kcal: 1800, proteinG: 120 };

describe('summarize', () => {
  it('shows the full targets left when nothing is logged', () => {
    const s = summarize([], targets, DEFAULT_SLOTS);
    expect(s).toMatchObject({ eatenKcal: 0, remainingKcal: 1800, remainingProteinG: 120, kcalOverBy: 0, proteinMet: false });
    expect(s.groups.map((g) => g.name)).toEqual(['Breakfast', 'Lunch', 'Snack', 'Dinner']);
  });

  it('subtracts what was eaten (240 kcal and 7.2 g leaves 1560 kcal and 112.8 g)', () => {
    const s = summarize([log('lunch', 240, 7.2)], targets, DEFAULT_SLOTS);
    expect(s.remainingKcal).toBe(1560);
    expect(s.remainingProteinG).toBeCloseTo(112.8, 5);
  });

  it('floors remaining at zero and reports how far over calories are', () => {
    const s = summarize([log('lunch', 1950, 50)], targets, DEFAULT_SLOTS);
    expect(s.remainingKcal).toBe(0);
    expect(s.kcalOverBy).toBe(150);
  });

  it('marks protein met at or above the target', () => {
    expect(summarize([log('lunch', 500, 125)], targets, DEFAULT_SLOTS).proteinMet).toBe(true);
    expect(summarize([log('lunch', 500, 120)], targets, DEFAULT_SLOTS).proteinMet).toBe(true);
    expect(summarize([log('lunch', 500, 119.9)], targets, DEFAULT_SLOTS).proteinMet).toBe(false);
    expect(summarize([log('lunch', 500, 125)], targets, DEFAULT_SLOTS).remainingProteinG).toBe(0);
  });

  it('groups entries under slots in order, with totals, and keeps empty slots', () => {
    const s = summarize(
      [log('dinner', 600, 30), log('breakfast', 300, 10), log('dinner', 200, 5)],
      targets,
      DEFAULT_SLOTS,
    );
    expect(s.groups.map((g) => [g.name, g.entries.length, g.kcal, g.proteinG])).toEqual([
      ['Breakfast', 1, 300, 10],
      ['Lunch', 0, 0, 0],
      ['Snack', 0, 0, 0],
      ['Dinner', 2, 800, 35],
    ]);
  });

  it('puts entries from a removed slot under "Other"', () => {
    const s = summarize([log('gone', 100, 1), log('lunch', 100, 1)], targets, DEFAULT_SLOTS);
    expect(s.groups.at(-1)).toMatchObject({ slotId: 'other', name: 'Other', kcal: 100 });
    expect(s.eatenKcal).toBe(200);
  });

  it('has no Other group when every entry has a slot', () => {
    expect(summarize([log('lunch', 100, 1)], targets, DEFAULT_SLOTS).groups.some((g) => g.slotId === 'other')).toBe(false);
  });
});

describe('mealProgress', () => {
  it('counts slots with entries out of all slots, ignoring Other', () => {
    const groups = [
      { slotId: 'breakfast', entries: [1] },
      { slotId: 'lunch', entries: [1, 2] },
      { slotId: 'snack', entries: [] },
      { slotId: 'dinner', entries: [] },
      { slotId: 'workout', entries: [] },
      { slotId: 'other', entries: [1] },
    ];
    expect(mealProgress(groups)).toEqual({ logged: 2, total: 5 });
  });

  it('is 0 of 0 with no slots', () => {
    expect(mealProgress([])).toEqual({ logged: 0, total: 0 });
  });
});
