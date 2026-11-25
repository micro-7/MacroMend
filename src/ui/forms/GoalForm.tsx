import { GOALS, type Goal } from '@/core/targets';
import { Hint, OptionRow } from '../kit';

const LABELS: Record<Goal, { label: string; description: string }> = {
  cut: { label: 'Cut', description: 'Lose fat: eat a little under what you burn.' },
  maintain: { label: 'Maintain', description: 'Stay at your current weight.' },
  bulk: { label: 'Bulk', description: 'Gain muscle: eat a little over what you burn.' },
};

export function GoalForm({ value, onChange }: { value: Goal | null; onChange: (g: Goal) => void }) {
  return (
    <>
      <Hint>This sets your calorie and protein targets. You can change it any time in Settings.</Hint>
      {GOALS.map((g) => (
        <OptionRow
          key={g}
          label={LABELS[g].label}
          description={LABELS[g].description}
          selected={value === g}
          onPress={() => onChange(g)}
        />
      ))}
    </>
  );
}
