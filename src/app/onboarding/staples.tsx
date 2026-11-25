import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useDb } from '@/db/DbContext';
import { useProfile } from '@/db/ProfileContext';
import { completeOnboarding } from '@/db/profile';
import { buildProfile, buildStaples } from '@/onboarding/buildProfile';
import { useOnboardingDraft } from '@/onboarding/OnboardingDraft';
import { StaplesPicker } from '@/ui/forms/StaplesPicker';
import { StepScreen } from '@/ui/kit';

export default function StaplesStep() {
  const router = useRouter();
  const db = useDb();
  const { reload } = useProfile();
  const { draft, update } = useOnboardingDraft();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    const profile = buildProfile(draft);
    if (!profile.ok) return setError(profile.error);
    const staples = buildStaples(draft.staples);
    if (!staples.ok) return setError(staples.error);
    setSaving(true);
    setError(null);
    try {
      await completeOnboarding(db, profile.value, staples.value);
      await reload(); // the route guard in the root layout then moves to the tabs
    } catch (e) {
      setError(`Couldn't save: ${e instanceof Error ? e.message : String(e)}`);
      setSaving(false);
    }
  };

  return (
    <StepScreen
      step="Step 5 of 5"
      title="Your usual foods"
      scroll={false}
      onBack={() => router.back()}
      onNext={finish}
      nextLabel={saving ? 'Saving…' : 'Finish'}
      nextDisabled={saving || !draft.dietType}
      error={error}
    >
      {draft.dietType ? (
        <StaplesPicker dietType={draft.dietType} selected={draft.staples} onChange={(staples) => update({ staples })} />
      ) : null}
    </StepScreen>
  );
}
