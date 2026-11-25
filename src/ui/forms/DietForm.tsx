import { DIET_LABELS, DIET_TYPES, type DietType } from '@/core/diet';
import { Hint, OptionRow } from '../kit';

const DESCRIPTIONS: Record<DietType, string> = {
  veg: 'No meat, fish or eggs. Dairy is fine.',
  eggetarian: 'Vegetarian plus eggs.',
  'non-veg': 'Everything.',
  vegan: 'No animal products at all.',
};

export function DietForm({ value, onChange }: { value: DietType | null; onChange: (d: DietType) => void }) {
  return (
    <>
      <Hint>
        This only filters what the app suggests and which foods are listed first. You can still log any food.
      </Hint>
      {DIET_TYPES.map((d) => (
        <OptionRow
          key={d}
          label={DIET_LABELS[d]}
          description={DESCRIPTIONS[d]}
          selected={value === d}
          onPress={() => onChange(d)}
        />
      ))}
    </>
  );
}
