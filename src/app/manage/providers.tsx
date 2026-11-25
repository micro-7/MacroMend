import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Hint, StepScreen } from '@/ui/kit';
import { colors } from '@/ui/theme';
import { useDb } from '@/db/DbContext';
import { listProviders, moveProvider, providerStatus, type ProviderRow, type ProviderStatus } from '@/db/providers';

const STATUS_TEXT: Record<ProviderStatus, { label: string; color: string }> = {
  ok: { label: 'Ready', color: colors.primary },
  disabled: { label: 'Off', color: colors.muted },
  rate_limited: { label: 'Rate limited, back shortly', color: '#B26A00' },
  out_of_quota: { label: 'Out of quota today', color: '#B26A00' },
  key_rejected: { label: 'Key rejected', color: colors.danger },
};

export default function ProvidersScreen() {
  const router = useRouter();
  const db = useDb();
  const [rows, setRows] = useState<ProviderRow[]>([]);

  const load = useCallback(async () => setRows(await listProviders(db)), [db]);
  // Reload whenever this screen comes back into view (after adding, editing or testing a provider).
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const move = async (id: string, d: -1 | 1) => {
    await moveProvider(db, id, d);
    await load();
  };

  return (
    <StepScreen title="AI providers" nextLabel="Add a provider" onNext={() => router.push('/manage/provider')}>
      <Hint>
        MacroMend tries these from top to bottom to understand what you type, and moves on if one runs out. Add your own free keys. If none works,
        you can still pick foods by hand.
      </Hint>
      {rows.length === 0 ? <Text style={styles.empty}>No providers yet. Add one to type "2 roti and dal" instead of searching.</Text> : null}
      {rows.map((p, i) => {
        const s = STATUS_TEXT[providerStatus(p)];
        return (
          <View key={p.id} style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${p.label}`}
              onPress={() => router.push({ pathname: '/manage/provider', params: { id: p.id } })}
              style={{ flex: 1 }}
            >
              <Text style={styles.name}>{i + 1}. {p.label}</Text>
              <Text style={styles.model}>{p.model}</Text>
              <Text style={[styles.status, { color: s.color }]}>{s.label}</Text>
            </Pressable>
            <Pressable accessibilityLabel={`Move ${p.label} up`} disabled={i === 0} onPress={() => move(p.id, -1)} style={[styles.icon, i === 0 && styles.off]}>
              <Text style={styles.iconText}>↑</Text>
            </Pressable>
            <Pressable accessibilityLabel={`Move ${p.label} down`} disabled={i === rows.length - 1} onPress={() => move(p.id, 1)} style={[styles.icon, i === rows.length - 1 && styles.off]}>
              <Text style={styles.iconText}>↓</Text>
            </Pressable>
          </View>
        );
      })}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.muted, fontSize: 15, marginVertical: 12, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  name: { fontSize: 16, color: colors.text, fontWeight: '600' },
  model: { fontSize: 13, color: colors.muted, marginTop: 2 },
  status: { fontSize: 13, marginTop: 2 },
  icon: { width: 38, height: 40, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 18, color: colors.text },
  off: { opacity: 0.3 },
});
