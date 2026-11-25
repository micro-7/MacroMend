import { StyleSheet, Text, View } from 'react-native';
import { formatKcal, formatProtein } from '@/core/portions';
import type { DaySummary } from '@/core/summary';
import { colors } from './theme';

export function WhatsLeftCard({
  summary,
  targets,
}: {
  summary: Pick<DaySummary<unknown>, 'eatenKcal' | 'eatenProteinG' | 'remainingKcal' | 'remainingProteinG' | 'kcalOverBy' | 'proteinMet'>;
  targets: { kcal: number; proteinG: number };
}) {
  const over = summary.kcalOverBy > 0;
  return (
    <View style={styles.card} accessibilityLabel="What's left today">
      <Text style={styles.title}>Left today</Text>
      <View style={styles.bigRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.big, over && { color: colors.danger }]}>{formatKcal(summary.remainingKcal)} kcal</Text>
          <Text style={styles.label}>calories left</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.big}>{formatProtein(summary.remainingProteinG)} g</Text>
          <Text style={styles.label}>protein left</Text>
        </View>
      </View>
      <Text style={styles.eaten}>
        Eaten {formatKcal(summary.eatenKcal)} of {targets.kcal} kcal · {formatProtein(summary.eatenProteinG)} of {targets.proteinG} g protein
      </Text>
      {over ? <Text style={styles.warn}>{formatKcal(summary.kcalOverBy)} kcal over target</Text> : null}
      {summary.proteinMet ? <Text style={styles.good}>Protein target met ✓</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 16 },
  title: { color: colors.muted, fontSize: 13, marginBottom: 8 },
  bigRow: { flexDirection: 'row', gap: 12 },
  big: { fontSize: 26, fontWeight: '700', color: colors.text },
  label: { color: colors.muted, fontSize: 13 },
  eaten: { color: colors.muted, fontSize: 13, marginTop: 12 },
  warn: { color: colors.danger, fontWeight: '700', marginTop: 8 },
  good: { color: colors.primary, fontWeight: '700', marginTop: 8 },
});
