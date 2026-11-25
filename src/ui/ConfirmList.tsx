import { StyleSheet, Text, View } from 'react-native';
import type { ConfirmFood, ConfirmItem } from '@/ai/confirm';
import { previewEntry } from '@/core/entryDraft';
import { unitHint, unitsFor } from '@/core/portions';
import type { Slot } from '@/core/slots';
import { Button, Chip, Field } from './kit';
import { colors } from './theme';

export function ConfirmList({
  items,
  foods,
  slots,
  onChange,
  onRemove,
  onPickFood,
  onSearchOnline,
  onSwitchFood,
}: {
  items: ConfirmItem[];
  foods: ReadonlyMap<string, ConfirmFood>;
  slots: Slot[];
  onChange: (key: string, patch: Partial<Pick<ConfirmItem, 'qtyText' | 'unit' | 'slot'>>) => void;
  onRemove: (key: string) => void;
  onPickFood: (key: string) => void;
  /** Look the food up in USDA and Open Food Facts (or ask the AI for an estimate). */
  onSearchOnline: (key: string) => void;
  onSwitchFood: (key: string, foodId: string) => void;
}) {
  return (
    <View>
      {items.map((item) => {
        const food = item.foodId ? foods.get(item.foodId) : undefined;
        const preview = food ? previewEntry(food, item.qtyText, item.unit) : null;
        return (
          <View key={item.key} style={[styles.card, !food && styles.cardWarn]} accessibilityLabel={`Item ${item.parsed.name}`}>
            {food ? (
              <>
                <Text style={styles.name}>{food.name}</Text>
                <Text style={styles.heard}>You said “{item.parsed.name}”</Text>
                {item.matchKind === 'fuzzy' ? <Text style={styles.check}>Check this match: it was a close guess for “{item.parsed.name}”.</Text> : null}
              </>
            ) : (
              <>
                <Text style={styles.name}>“{item.parsed.name}”</Text>
                <Text style={styles.notFound}>Not found</Text>
                <Text style={styles.heard}>It won't be logged until you pick a food or remove it.</Text>
                <View style={{ marginTop: 8, gap: 8 }}>
                  <Button label="Search online" variant="secondary" onPress={() => onSearchOnline(item.key)} />
                  <Button label="Pick food" variant="secondary" onPress={() => onPickFood(item.key)} />
                </View>
              </>
            )}

            {food ? (
              <>
                <View style={{ marginTop: 10 }}>
                  <Field
                    label="How much?"
                    value={item.qtyText}
                    onChangeText={(qtyText) => onChange(item.key, { qtyText })}
                    keyboardType="numbers-and-punctuation"
                    suffix={item.unit}
                    error={preview && !preview.ok ? preview.error : null}
                    accessibilityLabel={`Quantity of ${food.name}`}
                  />
                </View>
                {item.quantityGuessed ? <Text style={styles.check}>Couldn't read the amount, so it starts at 1. Please check it.</Text> : null}
                {!item.unitRecognized && item.parsed.unit.trim() !== '' ? (
                  <Text style={styles.heard}>“{item.parsed.unit}” isn't a unit for this food, so {item.unit} is used.</Text>
                ) : null}
                <View style={styles.chips}>
                  {unitsFor(food).map((u) => (
                    <Chip key={u} label={u} hint={unitHint(food, u)} selected={item.unit === u} onPress={() => onChange(item.key, { unit: u })} />
                  ))}
                </View>
                <Text style={styles.sectionLabel}>Meal</Text>
                <View style={styles.chips}>
                  {slots.map((s) => (
                    <Chip key={s.id} label={s.name} selected={item.slot === s.id} onPress={() => onChange(item.key, { slot: s.id })} />
                  ))}
                </View>
                <Text style={styles.preview}>{preview?.ok ? preview.text : '—'}</Text>
                {item.alternatives.length > 0 ? (
                  <>
                    <Text style={styles.sectionLabel}>Or did you mean</Text>
                    <View style={styles.chips}>
                      {item.alternatives.map((a) => (
                        <Chip key={a.foodId} label={a.foodName} selected={false} onPress={() => onSwitchFood(item.key, a.foodId)} />
                      ))}
                    </View>
                  </>
                ) : null}
                <View style={styles.actions}>
                  <View style={{ flex: 1 }}>
                    <Button label="Pick another food" variant="secondary" onPress={() => onPickFood(item.key)} />
                  </View>
                </View>
              </>
            ) : null}
            <View style={{ marginTop: 8 }}>
              <Button label={`Remove ${item.parsed.name}`} variant="danger" onPress={() => onRemove(item.key)} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 12 },
  cardWarn: { borderWidth: 1, borderColor: colors.danger },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  heard: { fontSize: 13, color: colors.muted, marginTop: 2 },
  check: { fontSize: 13, color: '#B26A00', marginTop: 4 },
  notFound: { fontSize: 14, color: colors.danger, fontWeight: '700', marginTop: 2 },
  sectionLabel: { fontSize: 13, color: colors.muted, marginTop: 10, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  preview: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
});
