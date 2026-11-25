import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/ui/Text';
import { DIET_LABELS } from '@/core/diet';
import { useDb } from '@/db/DbContext';
import { countFoods } from '@/db/foods';
import { useProfile } from '@/db/ProfileContext';
import { listProviders } from '@/db/providers';
import { isOnlineLookupEnabled } from '@/db/settings';
import { listSavedFoods } from '@/db/userFoods';
import { usePhoneModelOptional } from '@/phone/PhoneModelContext';
import { isSupportedPhone } from '@/phone/deviceSupport';
import { Screen } from '@/ui/Screen';
import { SectionTitle } from '@/ui/kit';
import { palette } from '@/ui/theme';

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
  const [providerCount, setProviderCount] = useState<number | null>(null);
  const [savedFoods, setSavedFoods] = useState<number | null>(null);
  const [lookupOn, setLookupOn] = useState<boolean | null>(null);
  const phone = usePhoneModelOptional();
  const phoneValue = !phone || !phone.facts ? undefined : !isSupportedPhone(phone.facts) ? 'Not supported' : phone.state.status === 'ready' ? (phone.phoneOnly ? 'Always on' : 'Ready') : phone.state.status === 'downloading' ? `${Math.round(phone.state.progress * 100)}%` : phone.state.status === 'incomplete' ? 'Paused' : 'Not downloaded';

  // Reload when the tab comes back into view, so counts reflect changes made in the screens it opened.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      countFoods(db).then((n) => {
        if (!cancelled) setFoods(n);
      });
      listProviders(db).then((p) => {
        if (!cancelled) setProviderCount(p.filter((x) => x.enabled).length);
      });
      listSavedFoods(db).then((f) => {
        if (!cancelled) setSavedFoods(f.length);
      });
      isOnlineLookupEnabled(db).then((on) => {
        if (!cancelled) setLookupOn(on);
      });
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

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
        <Row
          label="AI providers"
          value={providerCount === null ? undefined : providerCount === 0 ? 'None' : `${providerCount} on`}
          onPress={() => router.push('/manage/providers')}
        />
        <Row label="Phone model" value={phoneValue} onPress={() => router.push('/manage/phone')} />
        <Row label="My foods" value={savedFoods === null ? undefined : String(savedFoods)} onPress={() => router.push('/manage/foods')} />
        <Row
          label="Food lookup"
          value={lookupOn === null ? undefined : lookupOn ? 'On' : 'Off'}
          onPress={() => router.push('/manage/lookup')}
        />

        <SectionTitle>About</SectionTitle>
        <Row label="About MacroMend" value={Constants.expoConfig?.version ?? 'unknown'} onPress={() => router.push('/manage/about')} />
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
    borderBottomColor: palette.border,
  },
  label: { fontSize: 16, color: palette.text },
  value: { fontSize: 16, color: palette.muted },
});
