import { DEFAULT_SLOTS } from '../slots';
import { defaultSlotFor, mealForHour, todayKey } from '../day';

const at = (h: number, m = 0) => new Date(2026, 10, 25, h, m);

describe('todayKey', () => {
  it('uses the local date with zero padding', () => {
    expect(todayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(todayKey(new Date(2026, 10, 25, 0, 0))).toBe('2026-11-25');
  });
});

describe('defaultSlotFor', () => {
  it.each([
    [7, 'breakfast'], [10, 'breakfast'], [11, 'lunch'], [13, 'lunch'], [15, 'lunch'],
    [16, 'snack'], [18, 'snack'], [19, 'dinner'], [23, 'dinner'], [2, 'breakfast'],
  ])('at %i:00 picks %s', (hour, id) => {
    expect(mealForHour(hour)).toBe(id);
    expect(defaultSlotFor(at(hour), DEFAULT_SLOTS).id).toBe(id);
  });

  it('picks Lunch at 13:30', () => {
    expect(defaultSlotFor(at(13, 30), DEFAULT_SLOTS).name).toBe('Lunch');
  });

  it('keeps working after a slot is renamed (matches by id)', () => {
    const renamed = DEFAULT_SLOTS.map((s) => (s.id === 'lunch' ? { ...s, name: 'Tiffin' } : s));
    expect(defaultSlotFor(at(13), renamed).name).toBe('Tiffin');
  });

  it('falls back to the first slot when the default meal does not exist', () => {
    const custom = [{ id: 'pre', name: 'Pre-workout' }, { id: 'post', name: 'Post-workout' }];
    expect(defaultSlotFor(at(13), custom).id).toBe('pre');
  });
});
