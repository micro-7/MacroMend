import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { TextInput } from '@/ui/TextInput';
import { Text } from '@/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDb } from '@/db/DbContext';
import type { FoodRow } from '@/db/foods';
import { searchFoods } from '@/db/staples';
import { Button } from './kit';
import { palette } from './theme';

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

  // Start from the typed words each time the sheet opens (adjusting state while rendering, as React recommends).
  const openKey = visible ? initialQuery : null;
  const [lastOpenKey, setLastOpenKey] = useState(openKey);
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    if (openKey !== null) setQuery(openKey);
  }

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
            placeholderTextColor={palette.muted}
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
  safe: { flex: 1, backgroundColor: palette.bg },
  head: { padding: 16 },
  search: { borderWidth: 1, borderColor: palette.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: palette.text, backgroundColor: palette.card },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  name: { fontSize: 16, color: palette.text },
  sub: { fontSize: 12, color: palette.muted, marginTop: 2 },
  empty: { color: palette.muted, padding: 16 },
  foot: { padding: 16 },
});
