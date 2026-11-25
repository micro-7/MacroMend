import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text } from '@/ui/Text';
import { defaultSlotFor, todayKey } from '@/core/day';
import { previewEntry } from '@/core/entryDraft';
import { unitHint, unitsFor } from '@/core/portions';
import { defaultUsualQty } from '@/core/staples';
import { useDay } from '@/db/DayContext';
import { useDb } from '@/db/DbContext';
import { getFoodById, type FoodRow } from '@/db/foods';
import { deleteLog, getLog, logFood, updateLog } from '@/db/logs';
import { useProfile } from '@/db/ProfileContext';
import { logHaptic } from '@/ui/haptics';
import { Button, Chip, Field, SectionTitle, StepScreen } from '@/ui/kit';
import { palette } from '@/ui/theme';

/** Log a food (opened with foodId) or edit/delete an existing entry (opened with logId). */
export default function EntryScreen() {
  const { foodId, logId } = useLocalSearchParams<{ foodId?: string; logId?: string }>();
  const router = useRouter();
  const db = useDb();
  const { profile } = useProfile();
  const day = useDay();

  const [food, setFood] = useState<FoodRow | null>(null);
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('');
  const [slot, setSlot] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const editing = logId !== undefined;

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
      if (logId !== undefined) {
        const log = await getLog(db, Number(logId));
        const f = log ? await getFoodById(db, log.foodId) : null;
        if (cancelled) return;
        if (!log || !f) return setMissing(true);
        setFood(f);
        setQty(String(Math.round(log.qty * 100) / 100));
        setUnit(log.unit);
        setSlot(log.slot);
      } else if (foodId) {
        const f = await getFoodById(db, foodId);
        if (cancelled) return;
        if (!f) return setMissing(true);
        setFood(f);
        setQty(String(defaultUsualQty(f.unit)));
        setUnit(f.unit);
        setSlot(defaultSlotFor(new Date(), profile.slots).id);
      } else {
        setMissing(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, foodId, logId, profile]);

  if (!profile) return null;
  if (missing) {
    return (
      <StepScreen title="Not found" onNext={() => router.back()} nextLabel="Close">
        <Text style={{ color: palette.muted }}>This food or entry is no longer available.</Text>
      </StepScreen>
    );
  }
  if (!food) return null;

  const preview = previewEntry(food, qty, unit);

  const save = async () => {
    if (!preview.ok) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateLog(db, Number(logId), { qty: preview.qty, unit, slot });
        await day.reload();
        router.back();
      } else {
        await logFood(db, { date: todayKey(), slot, foodId: food.id, qty: preview.qty, unit });
        await day.reload();
        void logHaptic();
        router.dismissTo('/');
      }
    } catch (e) {
      setError(`Couldn't save: ${e instanceof Error ? e.message : String(e)}`);
      setSaving(false);
    }
  };

  const remove = () =>
    Alert.alert('Delete this entry?', `${food.name} will be removed from today.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLog(db, Number(logId));
            await day.reload();
            router.back();
          } catch (e) {
            setError(`Couldn't delete: ${e instanceof Error ? e.message : String(e)}`);
          }
        },
      },
    ]);

  return (
    <StepScreen
      title={food.name}
      onNext={save}
      nextLabel={saving ? 'Saving…' : editing ? 'Save changes' : 'Log it'}
      nextDisabled={saving || !preview.ok}
      error={error}
    >
      <Field
        label="How much?"
        value={qty}
        onChangeText={setQty}
        keyboardType="numbers-and-punctuation"
        placeholder="e.g. 2, 0.5 or 1/2"
        error={preview.ok ? null : preview.error}
        suffix={unit}
        accessibilityLabel="Quantity"
      />

      <SectionTitle>Unit</SectionTitle>
      <View style={styles.chips}>
        {unitsFor(food).map((u) => (
          <Chip key={u} label={u} hint={unitHint(food, u)} selected={unit === u} onPress={() => setUnit(u)} />
        ))}
      </View>

      <SectionTitle>Meal</SectionTitle>
      <View style={styles.chips}>
        {profile.slots.map((s) => (
          <Chip key={s.id} label={s.name} selected={slot === s.id} onPress={() => setSlot(s.id)} />
        ))}
        {!profile.slots.some((s) => s.id === slot) && slot ? <Chip label="Other" selected onPress={() => {}} /> : null}
      </View>

      <View style={styles.preview}>
        <Text style={styles.previewLabel}>This adds</Text>
        <Text style={styles.previewText}>{preview.ok ? preview.text : '—'}</Text>
      </View>

      {editing ? (
        <View style={{ marginTop: 20 }}>
          <Button label="Delete this entry" variant="danger" onPress={remove} />
        </View>
      ) : null}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preview: { backgroundColor: palette.card, borderRadius: 16, padding: 16, marginTop: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.border },
  previewLabel: { color: palette.muted, fontSize: 13 },
  previewText: { fontSize: 18, fontWeight: '700', color: palette.text, marginTop: 4 },
});
