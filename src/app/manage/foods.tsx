import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useDb } from '@/db/DbContext';
import type { FoodRow } from '@/db/foods';
import { listSavedFoods } from '@/db/userFoods';
import { Hint, StepScreen } from '@/ui/kit';
import { colors } from '@/ui/theme';

const SOURCE_TEXT: Record<FoodRow['source'], string> = {
  'built-in': 'Built in',
  usda: 'From USDA',
  openfoodfacts: 'From Open Food Facts',
  user: 'Added by you',
  'ai-estimated': 'AI estimate — not checked yet',
};

export default function MyFoodsScreen() {
  const router = useRouter();
  const db = useDb();
  const [foods, setFoods] = useState<FoodRow[]>([]);

  // Reload when coming back from the edit screen.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listSavedFoods(db).then((f) => {
        if (!cancelled) setFoods(f);
      });
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  return (
    <StepScreen title="My foods" nextLabel="Add my own food" onNext={() => router.push('/manage/food')}>
      <Hint>
        Foods you saved from online search, AI estimates and foods you added yourself. The built-in foods are not listed here. Changing a food
        does not change entries you already logged.
      </Hint>
      {foods.length === 0 ? <Text style={styles.empty}>Nothing saved yet. Foods you find online or estimate will appear here.</Text> : null}
      {foods.map((f) => (
        <Pressable
          key={f.id}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${f.name}`}
          onPress={() => router.push({ pathname: '/manage/food', params: { id: f.id } })}
          style={styles.row}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{f.name}</Text>
            <Text style={styles.sub}>
              {Math.round(f.kcalPer100g)} kcal · {f.proteinPer100g} g protein per 100 g
            </Text>
            <Text style={[styles.source, f.source === 'ai-estimated' && { color: '#B26A00' }]}>{SOURCE_TEXT[f.source]}</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </Pressable>
      ))}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.muted, fontSize: 15, marginVertical: 12, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  name: { fontSize: 16, color: colors.text, fontWeight: '600' },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  source: { fontSize: 12, color: colors.primary, marginTop: 2, fontWeight: '600' },
  chev: { fontSize: 22, color: colors.muted },
});
