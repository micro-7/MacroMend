export type Goal = 'cut' | 'maintain' | 'bulk';
export type Sex = 'male' | 'female';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'athlete';

export const GOALS: Goal[] = ['cut', 'maintain', 'bulk'];
export const ACTIVITIES: Activity[] = ['sedentary', 'light', 'moderate', 'very_active', 'athlete'];

export const ACTIVITY_FACTORS: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  athlete: 1.9,
};

export const ACTIVITY_LABELS: Record<Activity, string> = {
  sedentary: 'Sedentary (desk job, little exercise)',
  light: 'Light (exercise 1-3 days a week)',
  moderate: 'Moderate (exercise 3-5 days a week)',
  very_active: 'Very active (exercise 6-7 days a week)',
  athlete: 'Athlete (hard training twice a day)',
};

const GOAL_KCAL_FACTOR: Record<Goal, number> = { cut: 0.8, maintain: 1, bulk: 1.1 };
const GOAL_PROTEIN_PER_KG: Record<Goal, number> = { cut: 2.0, maintain: 1.6, bulk: 1.8 };

export const KCAL_FLOOR = 1200;
export const KCAL_RANGE = { min: 800, max: 6000 } as const;
export const PROTEIN_RANGE = { min: 20, max: 400 } as const;
export const BODY_RANGE = {
  weightKg: { min: 30, max: 300 },
  heightCm: { min: 100, max: 250 },
  age: { min: 14, max: 100 },
} as const;

export interface BodyDetails {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activity: Activity;
}

export interface CalculatedTargets {
  kcal: number;
  proteinG: number;
  /** True when the calculated kcal was below the floor and was raised to it. */
  raisedToFloor: boolean;
}

/** Mifflin-St Jeor basal metabolic rate in kcal/day (unrounded). */
export function bmr(b: BodyDetails): number {
  return 10 * b.weightKg + 6.25 * b.heightCm - 5 * b.age + (b.sex === 'male' ? 5 : -161);
}

/** Daily kcal and protein for a body and goal. Only the final values are rounded. */
export function calculateTargets(b: BodyDetails, goal: Goal): CalculatedTargets {
  const raw = bmr(b) * ACTIVITY_FACTORS[b.activity] * GOAL_KCAL_FACTOR[goal];
  const rounded = Math.round(raw / 10) * 10;
  const kcal = Math.max(KCAL_FLOOR, rounded);
  const proteinG = Math.round((b.weightKg * GOAL_PROTEIN_PER_KG[goal]) / 5) * 5;
  return { kcal, proteinG, raisedToFloor: rounded < KCAL_FLOOR };
}

export function validateKcal(kcal: number): string | null {
  if (!Number.isFinite(kcal)) return 'Enter a number.';
  if (kcal < KCAL_RANGE.min || kcal > KCAL_RANGE.max) {
    return `Calories must be between ${KCAL_RANGE.min} and ${KCAL_RANGE.max}.`;
  }
  return null;
}

export function validateProtein(protein: number): string | null {
  if (!Number.isFinite(protein)) return 'Enter a number.';
  if (protein < PROTEIN_RANGE.min || protein > PROTEIN_RANGE.max) {
    return `Protein must be between ${PROTEIN_RANGE.min} and ${PROTEIN_RANGE.max} g.`;
  }
  return null;
}
