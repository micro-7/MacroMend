import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { formatKcal, formatProtein } from '@/core/portions';
import { mealProgress, type DaySummary } from '@/core/summary';
import { Card, ProgressRing } from './components';
import { fonts, palette, space } from './theme';

type Icon = keyof typeof Feather.glyphMap;

function RingCard({
  label,
  fraction,
  color,
  icon,
  number,
  unit,
}: {
  label: string;
  fraction: number;
  color: string;
  icon: Icon;
  number: string;
  unit: string;
}) {
  return (
    <Card style={styles.ringCard}>
      <ProgressRing value={fraction} size={72} stroke={8} color={color} label={label}>
        <Feather name={icon} size={22} color={color} />
      </ProgressRing>
      <Text style={styles.number} accessibilityLabel={`${number} ${unit}`}>{number}</Text>
      <Text style={styles.unit}>{unit}</Text>
    </Card>
  );
}

/** The three rings on Today: calories left, protein left, and how many meals have something logged. */
export function WhatsLeftCard({
  summary,
  targets,
}: {
  summary: Pick<
    DaySummary<unknown>,
    'eatenKcal' | 'eatenProteinG' | 'remainingKcal' | 'remainingProteinG' | 'kcalOverBy' | 'proteinMet' | 'groups'
  >;
  targets: { kcal: number; proteinG: number };
}) {
  const over = summary.kcalOverBy > 0;
  const meals = mealProgress(summary.groups);
  return (
    <View accessibilityLabel="What's left today">
      <View style={styles.row}>
        <RingCard
          label="Calories eaten"
          fraction={targets.kcal > 0 ? summary.eatenKcal / targets.kcal : 0}
          color={over ? palette.warning : palette.coral}
          icon="zap"
          number={formatKcal(summary.remainingKcal)}
          unit="kcal left"
        />
        <RingCard
          label="Protein eaten"
          fraction={targets.proteinG > 0 ? summary.eatenProteinG / targets.proteinG : 0}
          color={palette.brandBright}
          icon="target"
          number={formatProtein(summary.remainingProteinG)}
          unit="g protein left"
        />
        <RingCard
          label="Meals logged"
          fraction={meals.total > 0 ? meals.logged / meals.total : 0}
          color={palette.info}
          icon="check-circle"
          number={`${meals.logged} of ${meals.total}`}
          unit="meals logged"
        />
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
  row: { flexDirection: 'row', gap: space.sm },
  ringCard: { flex: 1, alignItems: 'center', paddingHorizontal: space.sm, paddingVertical: space.md, gap: 2 },
  number: { fontFamily: fonts.bold, fontSize: 20, color: palette.text, marginTop: space.sm, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, textAlign: 'center' },
  eaten: { fontFamily: fonts.body, fontSize: 13, color: palette.muted, marginTop: space.md },
  warn: { fontFamily: fonts.semibold, fontSize: 14, color: palette.warning, marginTop: space.xs },
  good: { fontFamily: fonts.semibold, fontSize: 14, color: palette.brandBright, marginTop: space.xs },
});
