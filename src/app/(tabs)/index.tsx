import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatKcal, formatProtein } from '@/core/portions';
import { summarize } from '@/core/summary';
import { useDay } from '@/db/DayContext';
import { useProfile } from '@/db/ProfileContext';
import { Screen } from '@/ui/Screen';
import { WhatsLeftCard } from '@/ui/WhatsLeftCard';
import { colors } from '@/ui/theme';

const qtyText = (qty: number) => String(Math.round(qty * 100) / 100);

export default function TodayScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { logs } = useDay();
  if (!profile) return null;

  const targets = { kcal: profile.kcalTarget, proteinG: profile.proteinTargetG };
  const summary = summarize(logs, targets, profile.slots);

  return (
    <Screen title="Today">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <WhatsLeftCard summary={summary} targets={targets} />
        {summary.groups.map((g) => (
          <View key={g.slotId} style={styles.group}>
            <View style={styles.groupHead}>
              <Text style={styles.groupName}>{g.name}</Text>
              {g.entries.length > 0 ? (
                <Text style={styles.groupTotal}>
                  {formatKcal(g.kcal)} kcal · {formatProtein(g.proteinG)} g
                </Text>
              ) : null}
            </View>
            {g.entries.length === 0 ? <Text style={styles.empty}>Nothing logged</Text> : null}
            {g.entries.map((e) => (
              <Pressable
                key={e.id}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${e.foodName}`}
                onPress={() => router.push({ pathname: '/entry', params: { logId: String(e.id) } })}
                style={styles.entry}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryName}>{e.foodName}</Text>
                  <Text style={styles.entrySub}>
                    {qtyText(e.qty)} {e.unit} · {formatKcal(e.kcal)} kcal · {formatProtein(e.proteinG)} g protein
                    {e.estimated ? ' · est.' : ''}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 14 },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  groupName: { fontSize: 17, fontWeight: '700', color: colors.text },
  groupTotal: { color: colors.muted, fontSize: 13 },
  empty: { color: colors.muted, fontSize: 14, paddingVertical: 6 },
  entry: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  entryName: { fontSize: 16, color: colors.text },
  entrySub: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
