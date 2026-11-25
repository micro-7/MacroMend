import { useRouter } from 'expo-router';
import { useOnboardingDraft } from '@/onboarding/OnboardingDraft';
import { MAX_NAME_LENGTH } from '@/db/profile';
import { Field, StepScreen } from '@/ui/kit';
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
      <Field
        label="What should we call you? (optional)"
        value={draft.name}
        onChangeText={(name) => update({ name })}
        placeholder="Your first name"
        maxLength={MAX_NAME_LENGTH}
        autoCapitalize="words"
        autoCorrect={false}
        accessibilityLabel="What should we call you? (optional)"
      />
      <GoalForm value={draft.goal} onChange={(goal) => update({ goal })} />
    </StepScreen>
  );
}
