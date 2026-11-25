import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DIET_LABELS } from '@/core/diet';
import { useDb } from '@/db/DbContext';
import { countFoods } from '@/db/foods';
import { useProfile } from '@/db/ProfileContext';
import { Screen } from '@/ui/Screen';
import { SectionTitle } from '@/ui/kit';
import { colors } from '@/ui/theme';

function Row({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  const content = (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value ?? (onPress ? '›' : '')}</Text>
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

export default function SettingsScreen() {
  const db = useDb();
  const router = useRouter();
  const { profile } = useProfile();
  const [foods, setFoods] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    countFoods(db).then((n) => {
      if (!cancelled) setFoods(n);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  return (
    <Screen title="Settings">
      <ScrollView>
        <SectionTitle>Your setup</SectionTitle>
        <Row
          label="Profile & targets"
          value={profile ? `${profile.kcalTarget} kcal · ${profile.proteinTargetG} g` : undefined}
          onPress={() => router.push('/manage/profile')}
        />
        <Row label="Diet" value={profile ? DIET_LABELS[profile.dietType] : undefined} />
        <Row label="Meal slots" value={profile ? String(profile.slots.length) : undefined} onPress={() => router.push('/manage/slots')} />
        <Row label="Usual foods" onPress={() => router.push('/manage/staples')} />

        <SectionTitle>About</SectionTitle>
        <Row label="App version" value={Constants.expoConfig?.version ?? 'unknown'} />
        <Row label="Foods loaded" value={foods === null ? '…' : String(foods)} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: { fontSize: 16, color: colors.text },
  value: { fontSize: 16, color: colors.muted },
});
