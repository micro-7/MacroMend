import { useRouter } from 'expo-router';
import { useOnboardingDraft } from '@/onboarding/OnboardingDraft';
import { SlotsEditor } from '@/ui/forms/SlotsEditor';
import { StepScreen } from '@/ui/kit';

export default function SlotsStep() {
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();
  return (
    <StepScreen
      step="Step 4 of 5"
      title="Your meals"
      onBack={() => router.back()}
      onNext={() => router.push('/onboarding/staples')}
    >
      <SlotsEditor slots={draft.slots} onChange={(slots) => update({ slots })} />
    </StepScreen>
  );
}
