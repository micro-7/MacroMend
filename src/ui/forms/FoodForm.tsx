import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Text } from '@/ui/Text';
import type { FoodCategory } from '@/core/diet';
import { validateFoodForm, type FoodFormErrors, type FoodFormParsed, type FoodFormValues } from '@/lookup/foodForm';
import { Button, Chip, ErrorText, Field, Hint } from '../kit';
import { palette } from '../theme';

const CATEGORIES: { id: FoodCategory; label: string }[] = [
  { id: 'veg', label: 'Vegetarian' },
  { id: 'egg', label: 'Egg' },
  { id: 'non-veg', label: 'Non-veg' },
  { id: 'vegan', label: 'Vegan' },
];

/** Name, calories and protein per 100 g, category and unit. Used to check an AI estimate, enter a food by hand, or edit a saved food. */
export function FoodForm({
  initial,
  banner,
  submitLabel,
  busy = false,
  error,
  showChecked = false,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial: FoodFormValues;
  banner?: string;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  /** Show the "values checked" switch (for AI estimates being edited). */
  showChecked?: boolean;
  onSubmit: (food: FoodFormParsed, checked: boolean) => void;
  onCancel?: () => void;
  onDelete?: () => void;
}) {
  const [v, setV] = useState<FoodFormValues>(initial);
  const [errors, setErrors] = useState<FoodFormErrors>({});
  const [checked, setChecked] = useState(false);
  const set = (patch: Partial<FoodFormValues>) => setV((x) => ({ ...x, ...patch }));
  const isGrams = v.unit.trim() === '' || v.unit.trim() === 'g';

  const submit = () => {
    const r = validateFoodForm(v);
    if (!r.ok) return setErrors(r.errors);
    setErrors({});
    onSubmit(r.food, checked);
  };

  return (
    <View>
      {banner ? <Text style={styles.banner}>{banner}</Text> : null}
      <Field label="Name" value={v.name} onChangeText={(name) => set({ name })} error={errors.name} accessibilityLabel="Food name" />
      <Field label="Calories per 100 g" suffix="kcal" keyboardType="decimal-pad" value={v.kcal} onChangeText={(kcal) => set({ kcal })} error={errors.kcal} accessibilityLabel="Calories per 100 g" />
      <Field label="Protein per 100 g" suffix="g" keyboardType="decimal-pad" value={v.protein} onChangeText={(protein) => set({ protein })} error={errors.protein} accessibilityLabel="Protein per 100 g" />
      <Text style={styles.label}>Category</Text>
      <View style={styles.chips}>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} label={c.label} selected={v.category === c.id} onPress={() => set({ category: c.id })} />
        ))}
      </View>
      {errors.category ? <ErrorText>{errors.category}</ErrorText> : null}
      <View style={{ marginTop: 14 }}>
        <Field label="Unit (g, piece, katori, plate…)" value={v.unit} onChangeText={(unit) => set({ unit })} autoCapitalize="none" accessibilityLabel="Unit" />
        {!isGrams ? (
          <Field label={`Weight of one ${v.unit.trim()}`} suffix="g" keyboardType="decimal-pad" value={v.gramsPerUnit} onChangeText={(gramsPerUnit) => set({ gramsPerUnit })} error={errors.gramsPerUnit} accessibilityLabel="Weight of one unit" />
        ) : null}
      </View>

      {showChecked ? (
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchText}>Values checked</Text>
            <Hint>Tick this once you have checked the numbers. Entries you log after that are no longer marked "est."</Hint>
          </View>
          <Switch value={checked} onValueChange={setChecked} trackColor={{ true: palette.brand, false: palette.cardHigh }} accessibilityLabel="Values checked" />
        </View>
      ) : null}

      {error ? <ErrorText>{error}</ErrorText> : null}
      <View style={{ marginTop: 12 }}>
        <Button label={busy ? 'Saving…' : submitLabel} disabled={busy} onPress={submit} />
      </View>
      {onCancel ? (
        <View style={{ marginTop: 8 }}>
          <Button label="Cancel" variant="secondary" disabled={busy} onPress={onCancel} />
        </View>
      ) : null}
      {onDelete ? (
        <View style={{ marginTop: 8 }}>
          <Button label="Delete this food" variant="danger" disabled={busy} onPress={onDelete} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.warning, color: palette.warning, padding: 10, borderRadius: 10, fontSize: 14, lineHeight: 20, marginBottom: 14, fontWeight: '600' },
  label: { fontSize: 14, color: palette.muted, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  switchText: { fontSize: 16, color: palette.text },
});
