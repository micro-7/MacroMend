import type { DietType } from '../core/diet';
import type { Slot } from '../core/slots';
import { validateUsualQty } from '../core/staples';
import type { Goal } from '../core/targets';
import { resolveTargets, type TargetsDraft } from '../core/targetsDraft';
import type { FoodRow } from '../db/foods';
import { normalizeDisplayName, type Profile } from '../db/profile';
import type { StapleInput } from '../db/staples';

/** A ticked staple while it is being edited; quantity is still text. */
export interface StapleDraft {
  food: FoodRow;
  qty: string;
}

export type BuildResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface ProfileDraft {
  /** What to call the user; may be empty. */
  name?: string;
  goal: Goal | null;
  targets: TargetsDraft;
  dietType: DietType | null;
  slots: Slot[];
}

function num(text: string): number | null {
  const t = text.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Turn a finished draft into the profile to save (without the onboarding timestamp). */
export function buildProfile(d: ProfileDraft): BuildResult<Omit<Profile, 'onboardedAt'>> {
  if (!d.goal) return { ok: false, error: 'Choose a goal.' };
  if (!d.dietType) return { ok: false, error: 'Choose a diet type.' };
  const targets = resolveTargets(d.targets, d.goal);
  if (!targets.ok) return { ok: false, error: 'Check your targets.' };

  // Body details are kept when they were entered, even if the user typed their own targets.
  const t = d.targets;
  const weight = num(t.weightKg);
  const height = num(t.heightCm);
  const age = num(t.age);
  const haveBody = weight !== null && height !== null && age !== null && t.sex !== null && t.activity !== null;

  return {
    ok: true,
    value: {
      name: normalizeDisplayName(d.name),
      goal: d.goal,
      dietType: d.dietType,
      weightKg: haveBody ? weight : null,
      heightCm: haveBody ? height : null,
      age: haveBody ? Math.round(age) : null,
      sex: haveBody ? t.sex : null,
      activity: haveBody ? t.activity : null,
      kcalTarget: targets.kcal,
      proteinTargetG: targets.proteinG,
      slots: d.slots,
    },
  };
}

/** Validate the usual quantities and turn staple drafts into rows to save. */
export function buildStaples(drafts: StapleDraft[]): BuildResult<StapleInput[]> {
  const out: StapleInput[] = [];
  for (const d of drafts) {
    const qty = num(d.qty);
    const err = validateUsualQty(qty ?? NaN, d.food.unit);
    if (err) return { ok: false, error: `${d.food.name}: ${err}` };
    out.push({ foodId: d.food.id, usualQty: qty as number, usualUnit: d.food.unit });
  }
  return { ok: true, value: out };
}
