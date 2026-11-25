import {
  BODY_RANGE,
  calculateTargets,
  validateKcal,
  validateProtein,
  type Activity,
  type Goal,
  type Sex,
} from './targets';

/** What the targets form holds while the user is filling it in (numbers are still text). */
export interface TargetsDraft {
  mode: 'type' | 'calculate';
  weightKg: string;
  heightCm: string;
  age: string;
  sex: Sex | null;
  activity: Activity | null;
  kcal: string;
  protein: string;
}

export const EMPTY_TARGETS_DRAFT: TargetsDraft = {
  mode: 'calculate',
  weightKg: '',
  heightCm: '',
  age: '',
  sex: null,
  activity: null,
  kcal: '',
  protein: '',
};

export type TargetsResult =
  | { ok: true; kcal: number; proteinG: number; note: string | null }
  | { ok: false; errors: Partial<Record<keyof TargetsDraft, string>> };

function parse(text: string): number {
  const t = text.trim();
  return t === '' ? NaN : Number(t);
}

function rangeError(value: number, r: { min: number; max: number }, label: string): string | null {
  if (!Number.isFinite(value)) return 'Enter a number.';
  if (value < r.min || value > r.max) return `${label} must be between ${r.min} and ${r.max}.`;
  return null;
}

/** Turn the form into final targets (typed or calculated) or per-field error messages. */
export function resolveTargets(draft: TargetsDraft, goal: Goal): TargetsResult {
  const errors: Partial<Record<keyof TargetsDraft, string>> = {};

  if (draft.mode === 'type') {
    const kcalErr = validateKcal(parse(draft.kcal));
    const proteinErr = validateProtein(parse(draft.protein));
    if (kcalErr) errors.kcal = kcalErr;
    if (proteinErr) errors.protein = proteinErr;
    if (kcalErr || proteinErr) return { ok: false, errors };
    return { ok: true, kcal: parse(draft.kcal), proteinG: parse(draft.protein), note: null };
  }

  const weight = parse(draft.weightKg);
  const height = parse(draft.heightCm);
  const age = parse(draft.age);
  const w = rangeError(weight, BODY_RANGE.weightKg, 'Weight');
  const h = rangeError(height, BODY_RANGE.heightCm, 'Height');
  const a = rangeError(age, BODY_RANGE.age, 'Age');
  if (w) errors.weightKg = w;
  if (h) errors.heightCm = h;
  if (a) errors.age = a;
  if (!draft.sex) errors.sex = 'Choose one.';
  if (!draft.activity) errors.activity = 'Choose one.';
  if (Object.keys(errors).length > 0 || !draft.sex || !draft.activity) return { ok: false, errors };

  const result = calculateTargets(
    { weightKg: weight, heightCm: height, age: Math.round(age), sex: draft.sex, activity: draft.activity },
    goal,
  );
  return {
    ok: true,
    kcal: result.kcal,
    proteinG: result.proteinG,
    note: result.raisedToFloor ? 'Raised to the 1200 kcal safe minimum.' : null,
  };
}
