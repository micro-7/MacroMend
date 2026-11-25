import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDb } from '@/db/DbContext';
import { countFoods } from '@/db/foods';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/theme';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const db = useDb();
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
      <Row label="App version" value={Constants.expoConfig?.version ?? 'unknown'} />
      <Row label="Foods loaded" value={foods === null ? '…' : String(foods)} />
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
