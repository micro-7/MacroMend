import { StyleSheet, View } from 'react-native';
import { Text } from '@/ui/Text';
import { ACTIVITIES, ACTIVITY_LABELS, type Goal, type Sex } from '@/core/targets';
import type { TargetsDraft, TargetsResult } from '@/core/targetsDraft';
import { Button, ErrorText, Field, Hint, OptionRow } from '../kit';
import { palette } from '../theme';

export function TargetsForm({
  goal,
  value,
  onChange,
  result,
  showErrors,
}: {
  goal: Goal;
  value: TargetsDraft;
  onChange: (next: TargetsDraft) => void;
  /** Outcome of resolveTargets for the current draft, computed by the screen. */
  result: TargetsResult;
  /** Show field errors (after the user tried to continue). */
  showErrors: boolean;
}) {
  const errors = !result.ok && showErrors ? result.errors : {};
  const set = (patch: Partial<TargetsDraft>) => onChange({ ...value, ...patch });

  const switchToType = () => {
    // Carry the suggested numbers over so the user can tweak them instead of starting blank.
    if (result.ok && value.kcal === '' && value.protein === '') {
      set({ mode: 'type', kcal: String(result.kcal), protein: String(result.proteinG) });
    } else {
      set({ mode: 'type' });
    }
  };

  return (
    <View>
      <View style={styles.toggle}>
        <View style={{ flex: 1 }}>
          <Button
            label="Calculate for me"
            variant={value.mode === 'calculate' ? 'primary' : 'secondary'}
            onPress={() => set({ mode: 'calculate' })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Type my own" variant={value.mode === 'type' ? 'primary' : 'secondary'} onPress={switchToType} />
        </View>
      </View>

      {value.mode === 'type' ? (
        <>
          <Field
            label="Calories per day"
            suffix="kcal"
            keyboardType="number-pad"
            value={value.kcal}
            onChangeText={(kcal) => set({ kcal })}
            error={errors.kcal}
            placeholder="e.g. 1800"
          />
          <Field
            label="Protein per day"
            suffix="g"
            keyboardType="number-pad"
            value={value.protein}
            onChangeText={(protein) => set({ protein })}
            error={errors.protein}
            placeholder="e.g. 120"
          />
        </>
      ) : (
        <>
          <Field label="Weight" suffix="kg" keyboardType="decimal-pad" value={value.weightKg} onChangeText={(weightKg) => set({ weightKg })} error={errors.weightKg} />
          <Field label="Height" suffix="cm" keyboardType="decimal-pad" value={value.heightCm} onChangeText={(heightCm) => set({ heightCm })} error={errors.heightCm} />
          <Field label="Age" suffix="years" keyboardType="number-pad" value={value.age} onChangeText={(age) => set({ age })} error={errors.age} />

          <Text style={styles.label}>Sex</Text>
          {(['male', 'female'] as Sex[]).map((s) => (
            <OptionRow key={s} label={s === 'male' ? 'Male' : 'Female'} selected={value.sex === s} onPress={() => set({ sex: s })} />
          ))}
          {errors.sex ? <ErrorText>{errors.sex}</ErrorText> : null}

          <Text style={[styles.label, { marginTop: 8 }]}>Activity level</Text>
          {ACTIVITIES.map((a) => (
            <OptionRow key={a} label={ACTIVITY_LABELS[a]} selected={value.activity === a} onPress={() => set({ activity: a })} />
          ))}
          {errors.activity ? <ErrorText>{errors.activity}</ErrorText> : null}

          {result.ok ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {goal === 'cut' ? 'Cut' : goal === 'bulk' ? 'Bulk' : 'Maintain'} targets for you
              </Text>
              <Text style={styles.cardBig}>
                {result.kcal} kcal · {result.proteinG} g protein
              </Text>
              {result.note ? <Text style={styles.cardNote}>{result.note}</Text> : null}
              <Hint>
                A starting point, not medical advice. Tap "Type my own" to change the numbers.
              </Hint>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  label: { fontSize: 14, color: palette.muted, marginBottom: 6 },
  card: { backgroundColor: palette.card, borderRadius: 12, padding: 14, marginTop: 8 },
  cardTitle: { color: palette.muted, fontSize: 13 },
  cardBig: { fontSize: 22, fontWeight: '700', color: palette.text, marginVertical: 4 },
  cardNote: { color: palette.danger, fontSize: 13, marginBottom: 4 },
});
