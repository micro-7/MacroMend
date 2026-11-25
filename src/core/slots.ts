export interface Slot {
  id: string;
  name: string;
}

export type SlotResult = { ok: true; slots: Slot[] } | { ok: false; error: string };

export const MAX_SLOTS = 8;
export const MAX_SLOT_NAME = 24;

export const DEFAULT_SLOTS: Slot[] = [
  { id: 'breakfast', name: 'Breakfast' },
  { id: 'lunch', name: 'Lunch' },
  { id: 'snack', name: 'Snack' },
  { id: 'dinner', name: 'Dinner' },
];

function defaultId(): string {
  return `slot-${Math.random().toString(36).slice(2, 8)}`;
}

/** Returns an error message for a bad slot name, or null when it is fine. */
export function validateSlotName(slots: Slot[], name: string, exceptId?: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Enter a name for the meal.';
  if (trimmed.length > MAX_SLOT_NAME) return `Use ${MAX_SLOT_NAME} characters or fewer.`;
  const clash = slots.some((s) => s.id !== exceptId && s.name.trim().toLowerCase() === trimmed.toLowerCase());
  return clash ? `"${trimmed}" is already used.` : null;
}

export function addSlot(slots: Slot[], name: string, makeId: () => string = defaultId): SlotResult {
  if (slots.length >= MAX_SLOTS) return { ok: false, error: `You can have at most ${MAX_SLOTS} meals.` };
  const error = validateSlotName(slots, name);
  if (error) return { ok: false, error };
  let id = makeId();
  while (slots.some((s) => s.id === id)) id = makeId();
  return { ok: true, slots: [...slots, { id, name: name.trim() }] };
}

/** Renaming keeps the slot's id, so entries already logged to it stay attached. */
export function renameSlot(slots: Slot[], id: string, name: string): SlotResult {
  if (!slots.some((s) => s.id === id)) return { ok: false, error: 'That meal no longer exists.' };
  const error = validateSlotName(slots, name, id);
  if (error) return { ok: false, error };
  return { ok: true, slots: slots.map((s) => (s.id === id ? { ...s, name: name.trim() } : s)) };
}

export function removeSlot(slots: Slot[], id: string): SlotResult {
  if (slots.length <= 1) return { ok: false, error: 'You need at least one meal.' };
  if (!slots.some((s) => s.id === id)) return { ok: false, error: 'That meal no longer exists.' };
  return { ok: true, slots: slots.filter((s) => s.id !== id) };
}

/** Move a slot one place up (-1) or down (+1). Moving past an end leaves the order unchanged. */
export function moveSlot(slots: Slot[], id: string, delta: -1 | 1): Slot[] {
  const from = slots.findIndex((s) => s.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= slots.length) return slots;
  const next = slots.slice();
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
