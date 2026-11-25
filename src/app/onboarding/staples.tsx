import { useRouter } from 'expo-router';
import { useOnboardingDraft } from '@/onboarding/OnboardingDraft';
import { StaplesPicker } from '@/ui/forms/StaplesPicker';
import { StepScreen } from '@/ui/kit';

export default function StaplesStep() {
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();

  return (
    <StepScreen
      step="Step 5 of 6"
      title="Your usual foods"
      scroll={false}
      onBack={() => router.back()}
      onNext={() => router.push('/onboarding/ai')}
      nextDisabled={!draft.dietType}
    >
      {draft.dietType ? (
        <StaplesPicker dietType={draft.dietType} selected={draft.staples} onChange={(staples) => update({ staples })} />
      ) : null}
    </StepScreen>
  );
}
