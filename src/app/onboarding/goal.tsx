import { useRouter } from 'expo-router';
import { useOnboardingDraft } from '@/onboarding/OnboardingDraft';
import { StepScreen } from '@/ui/kit';
import { GoalForm } from '@/ui/forms/GoalForm';

export default function GoalStep() {
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();
  return (
    <StepScreen
      step="Step 1 of 6"
      title="What's your goal?"
      onNext={() => router.push('/onboarding/targets')}
      nextDisabled={!draft.goal}
    >
      <GoalForm value={draft.goal} onChange={(goal) => update({ goal })} />
    </StepScreen>
  );
}
