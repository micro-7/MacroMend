import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, View } from 'react-native';
import { TextInput } from '@/ui/TextInput';
import { Text } from '@/ui/Text';
import { DIET_LABELS, allowedCategories, type DietType } from '@/core/diet';
import { isProteinFood } from '@/core/foodRole';
import { defaultUsualQty, validateUsualQty } from '@/core/staples';
import { QUICK_PICKS } from '@/data/quickPicks';
import { useDb } from '@/db/DbContext';
import { getFoodsByIds, type FoodRow } from '@/db/foods';
import { searchFoods } from '@/db/staples';
import type { StapleDraft } from '@/onboarding/buildProfile';
import { Hint, SectionTitle } from '../kit';
import { palette } from '../theme';

function QtyRow({ item, onQty, onRemove }: { item: StapleDraft; onQty: (qty: string) => void; onRemove: () => void }) {
  const n = item.qty.trim() === '' ? NaN : Number(item.qty);
  const error = validateUsualQty(n, item.food.unit);
  return (
    <View style={styles.selRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.foodName}>{item.food.name}</Text>
        {error ? <Text style={styles.err}>{error}</Text> : null}
      </View>
      <TextInput
        style={[styles.qty, error ? { borderColor: palette.danger } : null]}
        value={item.qty}
        onChangeText={onQty}
        keyboardType="decimal-pad"
        accessibilityLabel={`Usual quantity of ${item.food.name}`}
      />
      <Text style={styles.unit}>{item.food.unit}</Text>
      <Pressable accessibilityLabel={`Remove ${item.food.name}`} onPress={onRemove} style={styles.x}>
        <Text style={{ color: palette.danger, fontSize: 18 }}>✕</Text>
      </Pressable>
    </View>
  );
}

export function StaplesPicker({
  dietType,
  selected,
  onChange,
}: {
  dietType: DietType;
  selected: StapleDraft[];
  onChange: (next: StapleDraft[]) => void;
}) {
  const db = useDb();
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [results, setResults] = useState<FoodRow[]>([]);
  const [quick, setQuick] = useState<FoodRow[]>([]);
  const categories = useMemo(() => allowedCategories(dietType), [dietType]);

  useEffect(() => {
    let cancelled = false;
    getFoodsByIds(db, QUICK_PICKS[dietType]).then((r) => {
      if (!cancelled) setQuick(r);
    });
    return () => {
      cancelled = true;
    };
  }, [db, dietType]);

  useEffect(() => {
    let cancelled = false;
    searchFoods(db, query, { categories: showAll ? undefined : categories, limit: 60 }).then((r) => {
      if (!cancelled) setResults(r);
    });
    return () => {
      cancelled = true;
    };
  }, [db, query, showAll, categories]);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.food.id)), [selected]);

  const toggle = (food: FoodRow) => {
    if (selectedIds.has(food.id)) onChange(selected.filter((s) => s.food.id !== food.id));
    else onChange([...selected, { food, qty: String(defaultUsualQty(food.unit)) }]);
  };

  const hasProtein = selected.some((s) => isProteinFood(s.food));
  const hasCarb = selected.some((s) => !isProteinFood(s.food));

  const header = (
    <View>
      <Hint>
        Tick the foods you usually eat. &quot;Fix my day&quot; will build your meals from these. Showing {DIET_LABELS[dietType].toLowerCase()} foods
        {showAll ? ' and everything else' : ''}.
      </Hint>

      {selected.length === 0 || !hasProtein || !hasCarb ? (
        <Text style={styles.warn}>
          &quot;Fix my day&quot; needs at least one protein food (like paneer, dal or eggs) and one carb food (like roti or rice).
          {selected.length === 0 ? ' You can also add them later in Settings.' : ''}
        </Text>
      ) : null}

      <SectionTitle>Quick picks</SectionTitle>
      <View style={styles.chips}>
        {quick.map((f) => (
          <Pressable
            key={f.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selectedIds.has(f.id) }}
            onPress={() => toggle(f)}
            style={[styles.chip, selectedIds.has(f.id) && styles.chipOn]}
          >
            <Text style={[styles.chipText, selectedIds.has(f.id) && { color: palette.onBrand }]}>{f.name}</Text>
          </Pressable>
        ))}
      </View>

      {selected.length > 0 ? (
        <>
          <SectionTitle>Your usual foods ({selected.length})</SectionTitle>
          {selected.map((s) => (
            <QtyRow
              key={s.food.id}
              item={s}
              onQty={(qty) => onChange(selected.map((x) => (x.food.id === s.food.id ? { ...x, qty } : x)))}
              onRemove={() => onChange(selected.filter((x) => x.food.id !== s.food.id))}
            />
          ))}
        </>
      ) : null}

      <SectionTitle>Search foods</SectionTitle>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search, e.g. dahi, paneer, chicken"
        placeholderTextColor={palette.muted}
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel="Search foods"
      />
      <View style={styles.switchRow}>
        <Text style={{ color: palette.text, fontSize: 15 }}>Show all foods</Text>
        <Switch value={showAll} onValueChange={setShowAll} trackColor={{ true: palette.brand, false: palette.cardHigh }} />
      </View>
      {results.length === 0 ? <Text style={styles.empty}>No foods found.</Text> : null}
    </View>
  );

  return (
    <FlatList
      data={results}
      keyExtractor={(f) => f.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      renderItem={({ item }) => {
        const on = selectedIds.has(item.id);
        return (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            onPress={() => toggle(item)}
            style={styles.resultRow}
          >
            <View style={[styles.box, on && styles.boxOn]}>{on ? <Text style={styles.tick}>✓</Text> : null}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.foodName}>{item.name}</Text>
              <Text style={styles.sub}>
                {item.category} · {Math.round(item.kcalPer100g)} kcal, {Math.round(item.proteinPer100g * 10) / 10} g protein per 100 g
              </Text>
            </View>
          </Pressable>
        );
      }}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}

const styles = StyleSheet.create({
  warn: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.warning, color: palette.warning, padding: 10, borderRadius: 10, fontSize: 13, lineHeight: 18, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  chipOn: { backgroundColor: palette.brand, borderColor: palette.brand },
  chipText: { color: palette.text, fontSize: 14 },
  selRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  qty: { width: 70, borderWidth: 1, borderColor: palette.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 16, textAlign: 'right', color: palette.text },
  unit: { width: 48, color: palette.muted, fontSize: 14 },
  x: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  err: { color: palette.danger, fontSize: 12 },
  search: { borderWidth: 1, borderColor: palette.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: palette.text, backgroundColor: palette.card },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  empty: { color: palette.muted, paddingVertical: 12 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: palette.muted, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: palette.brand, borderColor: palette.brand },
  tick: { color: palette.onBrand, fontSize: 14, fontWeight: '700' },
  foodName: { fontSize: 16, color: palette.text },
  sub: { fontSize: 12, color: palette.muted, marginTop: 2 },
});
