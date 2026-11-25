import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useDb } from '@/db/DbContext';
import type { FoodRow } from '@/db/foods';
import { listStaples, searchFoods } from '@/db/staples';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/theme';

export default function LogScreen() {
  const router = useRouter();
  const db = useDb();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodRow[]>([]);
  const [usual, setUsual] = useState<FoodRow[]>([]);
  const searching = query.trim() !== '';

  useEffect(() => {
    let cancelled = false;
    listStaples(db).then((rows) => {
      if (!cancelled) setUsual(rows.map((r) => r.food));
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    // Logging is never limited by diet type, so search every food.
    searchFoods(db, query, { limit: 60 }).then((r) => {
      if (!cancelled) setResults(r);
    });
    return () => {
      cancelled = true;
    };
  }, [db, query, searching]);

  const data = searching ? results : usual;

  return (
    <Screen title="Log">
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search foods, e.g. dahi, roti, whey"
        placeholderTextColor={colors.muted}
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel="Search foods"
      />
      {!searching && usual.length > 0 ? <Text style={styles.section}>Your usual foods</Text> : null}
      {!searching && usual.length === 0 ? (
        <Text style={styles.empty}>Type a food name to find it. Add your usual foods in Settings to see them here.</Text>
      ) : null}
      {searching && results.length === 0 ? <Text style={styles.empty}>No foods found</Text> : null}
      <FlatList
        data={data}
        keyExtractor={(f) => f.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Log ${item.name}`}
            onPress={() => router.push({ pathname: '/entry', params: { foodId: item.id } })}
            style={styles.row}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>
                {item.unit === 'g' ? 'per 100 g' : `per ${item.unit} (${Math.round(item.gramsPerUnit)} g)`} ·{' '}
                {Math.round((item.kcalPer100g * item.gramsPerUnit) / (item.unit === 'g' ? 1 : 100))} kcal
              </Text>
            </View>
          </Pressable>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.text, backgroundColor: '#fff', marginBottom: 8 },
  section: { color: colors.muted, fontSize: 13, marginVertical: 8 },
  empty: { color: colors.muted, fontSize: 15, paddingVertical: 12 },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  name: { fontSize: 16, color: colors.text },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
