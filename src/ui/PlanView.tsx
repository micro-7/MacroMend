import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatKcal, formatProtein } from '@/core/portions';
import type { Plan, PlanItem, PlanReason } from '@/core/rebalance';
import { Button } from './kit';
import { colors } from './theme';

const MESSAGES: Record<PlanReason, string> = {
  kcal_reached: "You've reached today's calorie target, so there's nothing to fix.",
  no_open_slots: 'Every meal already has something logged today.',
  no_protein_staple: 'Add a protein food you usually eat (like paneer, dal or eggs) to your usual foods, then try again.',
  too_few_kcal: "There aren't enough calories left for a full portion of your usual foods.",
};

const qtyText = (qty: number) => String(Math.round(qty * 100) / 100);

export function PlanView({
  plan,
  slotNames,
  remaining,
  onSwap,
  onLogItem,
  onLogSlot,
  onShuffle,
  onOpenStaples,
}: {
  plan: Plan;
  slotNames: Record<string, string>;
  remaining: { kcal: number; proteinG: number };
  onSwap: (slotId: string, index: number) => void;
  onLogItem: (slotId: string, item: PlanItem) => void;
  onLogSlot: (slotId: string) => void;
  onShuffle: () => void;
  onOpenStaples: () => void;
}) {
  if (plan.reason && plan.reason !== 'too_few_kcal') {
    return (
      <View>
        <Text style={styles.message}>{MESSAGES[plan.reason]}</Text>
        {plan.reason === 'no_protein_staple' ? <Button label="Go to usual foods" onPress={onOpenStaples} /> : null}
      </View>
    );
  }
  if (plan.reason === 'too_few_kcal') return <Text style={styles.message}>{MESSAGES.too_few_kcal}</Text>;

  return (
    <View>
      <Text style={styles.summary}>
        Left today: {formatKcal(remaining.kcal)} kcal · {formatProtein(remaining.proteinG)} g protein
      </Text>

      {plan.slots.map((slot) => (
        <View key={slot.slotId} style={styles.card}>
          <Text style={styles.slotName}>{slotNames[slot.slotId] ?? slot.slotId}</Text>
          {slot.items.length === 0 ? <Text style={styles.sub}>No room left for this meal.</Text> : null}
          {slot.items.map((item, index) => (
            <View key={`${item.foodId}-${index}`} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>
                  {qtyText(item.qty)} {item.unit} {item.name}
                </Text>
                <Text style={styles.sub}>
                  {formatKcal(item.kcal)} kcal · {formatProtein(item.proteinG)} g protein
                </Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Swap ${item.name}`} onPress={() => onSwap(slot.slotId, index)} style={styles.small}>
                <Text style={styles.smallText}>Swap</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Log ${item.name}`} onPress={() => onLogItem(slot.slotId, item)} style={styles.small}>
                <Text style={styles.smallText}>Log</Text>
              </Pressable>
            </View>
          ))}
          {slot.items.length > 0 ? (
            <View style={styles.slotFoot}>
              <Text style={styles.sub}>
                {formatKcal(slot.kcal)} kcal · {formatProtein(slot.proteinG)} g protein
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Log ${slotNames[slot.slotId] ?? slot.slotId}`} onPress={() => onLogSlot(slot.slotId)} style={styles.logAll}>
                <Text style={styles.logAllText}>Log this meal</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}

      <Text style={styles.total}>
        Plan: {formatKcal(plan.totalKcal)} kcal · {formatProtein(plan.totalProteinG)} g protein
      </Text>
      {plan.proteinShortByG >= 1 ? (
        <Text style={styles.short}>Protein still short by {formatProtein(plan.proteinShortByG)} g</Text>
      ) : null}
      <Text style={styles.hint}>Logging one item closes that meal, so its other suggestions go away.</Text>
      <View style={{ marginTop: 12 }}>
        <Button label="Shuffle" variant="secondary" onPress={onShuffle} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  message: { fontSize: 16, color: colors.text, lineHeight: 23, marginBottom: 16 },
  summary: { color: colors.muted, fontSize: 14, marginBottom: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 12 },
  slotName: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  itemName: { fontSize: 16, color: colors.text },
  sub: { fontSize: 13, color: colors.muted },
  small: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  smallText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  slotFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  logAll: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: colors.primary },
  logAllText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  total: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 4 },
  short: { color: colors.danger, fontSize: 14, marginTop: 4 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 8 },
});
