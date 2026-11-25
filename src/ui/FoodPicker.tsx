import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDb } from '@/db/DbContext';
import type { FoodRow } from '@/db/foods';
import { searchFoods } from '@/db/staples';
import { Button } from './kit';
import { colors } from './theme';

/** Search every food and pick one. Used when the AI's food was not found, or the user wants a different one. */
export function FoodPicker({
  visible,
  initialQuery = '',
  onPick,
  onClose,
}: {
  visible: boolean;
  initialQuery?: string;
  onPick: (food: FoodRow) => void;
  onClose: () => void;
}) {
  const db = useDb();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<FoodRow[]>([]);

  useEffect(() => {
    if (visible) setQuery(initialQuery);
  }, [visible, initialQuery]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    searchFoods(db, query, { limit: 60 }).then((r) => {
      if (!cancelled) setResults(r);
    });
    return () => {
      cancelled = true;
    };
  }, [db, query, visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.head}>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Search foods"
            placeholderTextColor={colors.muted}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Search foods to pick"
          />
        </View>
        <FlatList
          data={results}
          keyExtractor={(f) => f.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.empty}>No foods found</Text>}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`Pick ${item.name}`} onPress={() => onPick(item)} style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>{item.category} · {Math.round(item.kcalPer100g)} kcal per 100 g</Text>
            </Pressable>
          )}
        />
        <View style={styles.foot}>
          <Button label="Cancel" variant="secondary" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  head: { padding: 16 },
  search: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.text, backgroundColor: '#fff' },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  name: { fontSize: 16, color: colors.text },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  empty: { color: colors.muted, padding: 16 },
  foot: { padding: 16 },
});
