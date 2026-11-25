import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDb } from '@/db/DbContext';
import { getFoodById, type FoodRow } from '@/db/foods';
import { createFood, deleteFood, isEditableFood, updateFood } from '@/db/userFoods';
import { EMPTY_FOOD_FORM, fromFood } from '@/lookup/foodForm';
import { FoodForm } from '@/ui/forms/FoodForm';
import { colors } from '@/ui/theme';

/** Edit or delete a saved food (opened with `id`), or add one of your own (no `id`). */
export default function FoodScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const db = useDb();
  const [food, setFood] = useState<FoodRow | null | undefined>(id ? undefined : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getFoodById(db, id).then((f) => {
      if (!cancelled) setFood(f);
    });
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  if (food === undefined) return null;
  if (id && (!food || !isEditableFood(food))) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.msg}>This food can't be edited here.</Text>
      </SafeAreaView>
    );
  }

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert('Delete this food?', 'Entries you already logged keep their numbers. It is removed from your usual foods.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => run(() => deleteFood(db, id!)) },
    ]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FoodForm
          initial={food ? fromFood(food) : EMPTY_FOOD_FORM}
          banner={food?.source === 'ai-estimated' ? 'This is an AI estimate. Check the numbers, then tick "Values checked".' : undefined}
          submitLabel={food ? 'Save' : 'Add food'}
          busy={busy}
          error={error}
          showChecked={food?.source === 'ai-estimated'}
          onSubmit={(v, checked) =>
            run(() =>
              food
                ? updateFood(db, food.id, { ...v, aliases: food.aliases, checked })
                : createFood(db, { ...v, aliases: [], source: 'user' }),
            )
          }
          onDelete={food ? confirmDelete : undefined}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  msg: { padding: 20, color: colors.muted, fontSize: 16 },
});
