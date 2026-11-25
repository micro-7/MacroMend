import type { DietType } from '../core/diet';
import type { Slot } from '../core/slots';
import type { Activity, Goal, Sex } from '../core/targets';
import type { Db } from './db';
import { writeStaples, type StapleInput } from './staples';

/** The longest display name kept. */
export const MAX_NAME_LENGTH = 30;

/** Trim a typed name; blank becomes no name, and it is cut at the length limit. */
export function normalizeDisplayName(raw: string | null | undefined): string | null {
  const t = (raw ?? '').trim().slice(0, MAX_NAME_LENGTH).trim();
  return t === '' ? null : t;
}

export interface Profile {
  /** What to call the user in the greeting; stays on the phone. */
  name?: string | null;
  goal: Goal;
  dietType: DietType;
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  sex: Sex | null;
  activity: Activity | null;
  kcalTarget: number;
  proteinTargetG: number;
  slots: Slot[];
  /** ISO time onboarding was finished; null while onboarding is still to do. */
  onboardedAt: string | null;
}

interface ProfileRow {
  name: string | null;
  goal: Goal;
  diet_type: DietType;
  weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  sex: Sex | null;
  activity: Activity | null;
  kcal_target: number;
  protein_target_g: number;
  slots: string;
  onboarded_at: string | null;
}

export async function getProfile(db: Db): Promise<Profile | null> {
  const r = await db.getFirst<ProfileRow>('SELECT * FROM profile WHERE id = 1');
  if (!r) return null;
  return {
    name: r.name,
    goal: r.goal,
    dietType: r.diet_type,
    weightKg: r.weight_kg,
    heightCm: r.height_cm,
    age: r.age,
    sex: r.sex,
    activity: r.activity,
    kcalTarget: r.kcal_target,
    proteinTargetG: r.protein_target_g,
    slots: JSON.parse(r.slots) as Slot[],
    onboardedAt: r.onboarded_at,
  };
}

/** True until a profile exists and onboarding has been completed. */
export function needsOnboarding(profile: Profile | null): boolean {
  return !profile || profile.onboardedAt === null;
}

/** Insert or replace the single profile row. */
export async function saveProfile(db: Db, p: Profile): Promise<void> {
  await db.run(
    `INSERT INTO profile (id, name, goal, diet_type, weight_kg, height_cm, age, sex, activity, kcal_target, protein_target_g, slots, onboarded_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, goal = excluded.goal, diet_type = excluded.diet_type, weight_kg = excluded.weight_kg,
       height_cm = excluded.height_cm, age = excluded.age, sex = excluded.sex, activity = excluded.activity,
       kcal_target = excluded.kcal_target, protein_target_g = excluded.protein_target_g,
       slots = excluded.slots, onboarded_at = excluded.onboarded_at`,
    [normalizeDisplayName(p.name), p.goal, p.dietType, p.weightKg, p.heightCm, p.age, p.sex, p.activity, p.kcalTarget, p.proteinTargetG, JSON.stringify(p.slots), p.onboardedAt],
  );
}

/**
 * Save everything collected during onboarding in one transaction. Nothing is
 * written until this runs, so a half-finished onboarding leaves no profile.
 */
export async function completeOnboarding(
  db: Db,
  profile: Omit<Profile, 'onboardedAt'>,
  staples: StapleInput[],
  now: Date = new Date(),
): Promise<void> {
  await db.transaction(async () => {
    await saveProfile(db, { ...profile, onboardedAt: now.toISOString() });
    await writeStaples(db, staples);
  });
}
