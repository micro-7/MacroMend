import type { Slot } from './slots';

export interface SummaryLog {
  slot: string;
  kcal: number;
  proteinG: number;
}

export interface SlotGroup<T> {
  /** Slot id, or "other" for entries whose slot no longer exists. */
  slotId: string;
  name: string;
  entries: T[];
  kcal: number;
  proteinG: number;
}

export interface DaySummary<T> {
  eatenKcal: number;
  eatenProteinG: number;
  /** Never negative. */
  remainingKcal: number;
  remainingProteinG: number;
  /** How many kcal over the target, or 0. */
  kcalOverBy: number;
  proteinMet: boolean;
  groups: SlotGroup<T>[];
}

export const OTHER_SLOT_ID = 'other';

/** Totals for today against the targets, with entries grouped under the user's slots in order. */
export function summarize<T extends SummaryLog>(
  logs: T[],
  targets: { kcal: number; proteinG: number },
  slots: Slot[],
): DaySummary<T> {
  const eatenKcal = logs.reduce((s, l) => s + l.kcal, 0);
  const eatenProteinG = logs.reduce((s, l) => s + l.proteinG, 0);

  const known = new Set(slots.map((s) => s.id));
  const groups: SlotGroup<T>[] = slots.map((s) => ({ slotId: s.id, name: s.name, entries: [], kcal: 0, proteinG: 0 }));
  const other: SlotGroup<T> = { slotId: OTHER_SLOT_ID, name: 'Other', entries: [], kcal: 0, proteinG: 0 };

  for (const l of logs) {
    const g = known.has(l.slot) ? groups.find((x) => x.slotId === l.slot)! : other;
    g.entries.push(l);
    g.kcal += l.kcal;
    g.proteinG += l.proteinG;
  }
  if (other.entries.length > 0) groups.push(other);

  return {
    eatenKcal,
    eatenProteinG,
    remainingKcal: Math.max(0, targets.kcal - eatenKcal),
    remainingProteinG: Math.max(0, targets.proteinG - eatenProteinG),
    kcalOverBy: Math.max(0, eatenKcal - targets.kcal),
    proteinMet: targets.proteinG > 0 && eatenProteinG >= targets.proteinG,
    groups,
  };
}
