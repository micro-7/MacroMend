import { DEFAULT_SLOTS, MAX_SLOTS, addSlot, moveSlot, removeSlot, renameSlot, validateSlotName } from '../slots';

const names = (slots: { name: string }[]) => slots.map((s) => s.name);
let n = 0;
const makeId = () => `slot-t${n++}`;

describe('slots', () => {
  it('starts with breakfast, lunch, snack, dinner', () => {
    expect(names(DEFAULT_SLOTS)).toEqual(['Breakfast', 'Lunch', 'Snack', 'Dinner']);
  });

  it('adds a pre-workout slot and moves it above Dinner', () => {
    const added = addSlot(DEFAULT_SLOTS, 'Pre-workout', makeId);
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const id = added.slots[4].id;
    const moved = moveSlot(added.slots, id, -1);
    expect(names(moved)).toEqual(['Breakfast', 'Lunch', 'Snack', 'Pre-workout', 'Dinner']);
  });

  it('refuses duplicate names ignoring case, and keeps the old name', () => {
    const r = renameSlot(DEFAULT_SLOTS, 'snack', 'lunch');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/already used/);
    expect(validateSlotName(DEFAULT_SLOTS, '  LUNCH ')).not.toBeNull();
    expect(validateSlotName(DEFAULT_SLOTS, 'Lunch', 'lunch')).toBeNull();
  });

  it('refuses empty names', () => {
    expect(addSlot(DEFAULT_SLOTS, '   ').ok).toBe(false);
  });

  it('refuses to remove the last slot', () => {
    const r = removeSlot([{ id: 'a', name: 'Only' }], 'a');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/at least one/);
  });

  it('removes a slot when more than one exists', () => {
    const r = removeSlot(DEFAULT_SLOTS, 'snack');
    expect(r.ok && names(r.slots)).toEqual(['Breakfast', 'Lunch', 'Dinner']);
  });

  it('caps the list at 8 slots', () => {
    let slots = DEFAULT_SLOTS;
    for (let i = 0; i < MAX_SLOTS - DEFAULT_SLOTS.length; i++) {
      const r = addSlot(slots, `Extra ${i}`, makeId);
      expect(r.ok).toBe(true);
      if (r.ok) slots = r.slots;
    }
    expect(slots).toHaveLength(MAX_SLOTS);
    expect(addSlot(slots, 'One too many', makeId).ok).toBe(false);
  });

  it('keeps the same id when renaming', () => {
    const r = renameSlot(DEFAULT_SLOTS, 'snack', 'Evening snack');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.slots[2]).toEqual({ id: 'snack', name: 'Evening snack' });
  });

  it('does not move past either end', () => {
    expect(moveSlot(DEFAULT_SLOTS, 'breakfast', -1)).toBe(DEFAULT_SLOTS);
    expect(moveSlot(DEFAULT_SLOTS, 'dinner', 1)).toBe(DEFAULT_SLOTS);
  });
});
