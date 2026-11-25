import { useRouter } from 'expo-router';
import { useState } from 'react';
import { resolveTargets } from '@/core/targetsDraft';
import { useOnboardingDraft } from '@/onboarding/OnboardingDraft';
import { TargetsForm } from '@/ui/forms/TargetsForm';
import { StepScreen } from '@/ui/kit';

export default function TargetsStep() {
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();
  const [showErrors, setShowErrors] = useState(false);
  const goal = draft.goal ?? 'maintain';
  const result = resolveTargets(draft.targets, goal);

  return (
    <StepScreen
      step="Step 2 of 5"
      title="Daily targets"
      onBack={() => router.back()}
      onNext={() => {
        if (!result.ok) return setShowErrors(true);
        router.push('/onboarding/diet');
      }}
    >
      <TargetsForm
        goal={goal}
        value={draft.targets}
        onChange={(targets) => update({ targets })}
        result={result}
        showErrors={showErrors}
      />
    </StepScreen>
  );
}
