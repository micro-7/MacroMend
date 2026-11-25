import { useRouter } from 'expo-router';
import { useState } from 'react';
import { resolveTargets, type TargetsDraft } from '@/core/targetsDraft';
import type { Goal } from '@/core/targets';
import type { DietType } from '@/core/diet';
import { useDb } from '@/db/DbContext';
import { useProfile } from '@/db/ProfileContext';
import { saveProfile, type Profile } from '@/db/profile';
import { buildProfile } from '@/onboarding/buildProfile';
import { DietForm } from '@/ui/forms/DietForm';
import { GoalForm } from '@/ui/forms/GoalForm';
import { TargetsForm } from '@/ui/forms/TargetsForm';
import { SectionTitle, StepScreen } from '@/ui/kit';

/** Start the form from what is saved: calculating if body details exist, otherwise typing. */
function toTargetsDraft(p: Profile): TargetsDraft {
  const haveBody = p.weightKg !== null && p.heightCm !== null && p.age !== null && p.sex !== null && p.activity !== null;
  return {
    mode: haveBody ? 'calculate' : 'type',
    weightKg: p.weightKg !== null ? String(p.weightKg) : '',
    heightCm: p.heightCm !== null ? String(p.heightCm) : '',
    age: p.age !== null ? String(p.age) : '',
    sex: p.sex,
    activity: p.activity,
    kcal: String(p.kcalTarget),
    protein: String(p.proteinTargetG),
  };
}

export default function ProfileSettings() {
  const router = useRouter();
  const db = useDb();
  const { profile, reload } = useProfile();
  const [goal, setGoal] = useState<Goal | null>(profile?.goal ?? null);
  const [dietType, setDietType] = useState<DietType | null>(profile?.dietType ?? null);
  const [targets, setTargets] = useState<TargetsDraft | null>(profile ? toTargetsDraft(profile) : null);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile || !targets) return null;
  const result = resolveTargets(targets, goal ?? profile.goal);

  const save = async () => {
    const built = buildProfile({ goal, dietType, targets, slots: profile.slots });
    if (!built.ok) {
      setShowErrors(true);
      return setError(built.error);
    }
    setSaving(true);
    setError(null);
    try {
      await saveProfile(db, { ...built.value, onboardedAt: profile.onboardedAt });
      await reload();
      router.back();
    } catch (e) {
      setError(`Couldn't save: ${e instanceof Error ? e.message : String(e)}`);
      setSaving(false);
    }
  };

  return (
    <StepScreen title="Profile & targets" onNext={save} nextLabel={saving ? 'Saving…' : 'Save'} nextDisabled={saving} error={error}>
      <SectionTitle>Goal</SectionTitle>
      <GoalForm value={goal} onChange={setGoal} />
      <SectionTitle>Daily targets</SectionTitle>
      <TargetsForm goal={goal ?? profile.goal} value={targets} onChange={setTargets} result={result} showErrors={showErrors} />
      <SectionTitle>Diet</SectionTitle>
      <DietForm value={dietType} onChange={setDietType} />
    </StepScreen>
  );
}
