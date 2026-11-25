import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/ui/Text';
import { greeting } from '@/core/greeting';
import { formatKcal, formatProtein } from '@/core/portions';
import { summarize } from '@/core/summary';
import { useDay } from '@/db/DayContext';
import { useProfile } from '@/db/ProfileContext';
import { Card, EmptyState, HeroCard } from '@/ui/components';
import { Button } from '@/ui/kit';
import { Screen } from '@/ui/Screen';
import { slotIcon } from '@/ui/slotIcon';
import { fonts, palette, space } from '@/ui/theme';
import { Title } from '@/ui/Title';
import { WhatsLeftCard } from '@/ui/WhatsLeftCard';

const qtyText = (qty: number) => String(Math.round(qty * 100) / 100);

export default function TodayScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { logs } = useDay();
  if (!profile) return null;

  const targets = { kcal: profile.kcalTarget, proteinG: profile.proteinTargetG };
  const summary = summarize(logs, targets, profile.slots);

  return (
    <Screen title={greeting(new Date(), profile.name)}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HeroCard style={styles.hero}>
          <Title size="hero" style={{ color: palette.onBrand }}>Not sure *what* to *eat* next?</Title>
          <Text style={styles.heroText}>We'll build the rest of your day from your usual foods, to fit what's left.</Text>
          <View style={{ marginTop: space.lg }}>
            <Button label="Fix my day" variant="light" onPress={() => router.push('/fix')} />
          </View>
        </HeroCard>

        <WhatsLeftCard summary={summary} targets={targets} />

        {summary.groups.map((g) => (
          <Card key={g.slotId} style={styles.group}>
            <View style={styles.groupHead}>
              <View style={styles.iconWrap}>
                <Feather name={slotIcon(g.name)} size={18} color={palette.brandBright} />
              </View>
              <Text style={styles.groupName}>{g.name}</Text>
              {g.entries.length > 0 ? (
                <Text style={styles.groupTotal}>
                  {formatKcal(g.kcal)} kcal · {formatProtein(g.proteinG)} g
                </Text>
              ) : null}
            </View>
            {g.entries.length === 0 ? (
              <EmptyState message="Nothing logged yet">
                <Pressable accessibilityRole="button" accessibilityLabel={`Add food to ${g.name}`} onPress={() => router.navigate('/log')} hitSlop={8}>
                  <Text style={styles.addLink}>+ Add food</Text>
                </Pressable>
              </EmptyState>
            ) : null}
            {g.entries.map((e) => (
              <Pressable
                key={e.id}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${e.foodName}`}
                onPress={() => router.push({ pathname: '/entry', params: { logId: String(e.id) } })}
                style={({ pressed }) => [styles.entry, pressed && { opacity: 0.8 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryName}>{e.foodName}</Text>
                  <Text style={styles.entrySub}>
                    {qtyText(e.qty)} {e.unit} · {formatKcal(e.kcal)} kcal · {formatProtein(e.proteinG)} g protein
                    {e.estimated ? ' · est.' : ''}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={palette.muted} />
              </Pressable>
            ))}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Extra bottom space so the floating tab bar never covers the last card.
  content: { paddingBottom: 120, gap: space.md },
  hero: { gap: space.sm },
  heroText: { fontFamily: fonts.body, fontSize: 14, color: '#E3F0E7', lineHeight: 20 },
  group: { gap: space.xs },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  iconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: palette.cardHigh, alignItems: 'center', justifyContent: 'center' },
  groupName: { flex: 1, fontFamily: fonts.semibold, fontSize: 17, color: palette.text },
  groupTotal: { fontFamily: fonts.body, fontSize: 13, color: palette.muted },
  addLink: { fontFamily: fonts.medium, fontSize: 14, color: palette.brandBright },
  entry: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border },
  entryName: { fontFamily: fonts.medium, fontSize: 16, color: palette.text },
  entrySub: { fontFamily: fonts.body, fontSize: 13, color: palette.muted, marginTop: 2 },
});
