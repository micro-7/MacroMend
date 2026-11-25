import type { Slot } from './slots';

/** Today's date as YYYY-MM-DD in the phone's local time. */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Which default meal fits this time of day. */
export function mealForHour(hour: number): 'breakfast' | 'lunch' | 'snack' | 'dinner' {
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 19) return 'snack';
  return 'dinner';
}

/**
 * Slot to preselect when logging: the default meal for the time of day if the user still has it
 * (renamed slots keep their id), otherwise the first slot.
 */
export function defaultSlotFor(now: Date, slots: Slot[]): Slot {
  const wanted = mealForHour(now.getHours());
  return slots.find((s) => s.id === wanted) ?? slots[0];
}
