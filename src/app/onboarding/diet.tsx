import { useRouter } from 'expo-router';
import { useOnboardingDraft } from '@/onboarding/OnboardingDraft';
import { DietForm } from '@/ui/forms/DietForm';
import { StepScreen } from '@/ui/kit';

export default function DietStep() {
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();
  return (
    <StepScreen
      step="Step 3 of 5"
      title="Your diet"
      onBack={() => router.back()}
      onNext={() => router.push('/onboarding/slots')}
      nextDisabled={!draft.dietType}
    >
      <DietForm value={draft.dietType} onChange={(dietType) => update(dietType === draft.dietType ? {} : { dietType, staples: [] })} />
    </StepScreen>
  );
}
