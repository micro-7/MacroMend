import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { runChain, type ChainResult } from '@/ai/chain';
import { toConfirmItems } from '@/ai/confirm';
import { explainFailure } from '@/ai/failureMessage';
import { secureKeyStore } from '@/ai/keyStore';
import { isOnline } from '@/ai/online';
import { useParseSession } from '@/ai/ParseSession';
import { resolveItems } from '@/ai/resolve';
import { defaultSlotFor } from '@/core/day';
import { useDb } from '@/db/DbContext';
import { loadMatchData, type FoodRow } from '@/db/foods';
import { useProfile } from '@/db/ProfileContext';
import { listStaples, searchFoods } from '@/db/staples';
import { Button } from '@/ui/kit';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/theme';

export default function LogScreen() {
  const router = useRouter();
  const db = useDb();
  const { profile } = useProfile();
  const { start } = useParseSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodRow[]>([]);
  const [usual, setUsual] = useState<FoodRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Extract<ChainResult, { ok: false }> | null>(null);
  const searching = query.trim() !== '';

  useEffect(() => {
    let cancelled = false;
    listStaples(db).then((rows) => {
      if (!cancelled) setUsual(rows.map((r) => r.food));
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    // Logging is never limited by diet type, so search every food.
    searchFoods(db, query, { limit: 60 }).then((r) => {
      if (!cancelled) setResults(r);
    });
    return () => {
      cancelled = true;
    };
  }, [db, query, searching]);

  const understand = async () => {
    if (!profile || !searching || busy) return;
    setBusy(true);
    setFailure(null);
    try {
      const slots = profile.slots.map((s) => ({ id: s.id, name: s.name }));
      const result = await runChain({ db, keys: secureKeyStore, isOnline }, query.trim(), { slots });
      if (!result.ok) return setFailure(result);
      const { index, units } = await loadMatchData(db);
      const items = toConfirmItems(resolveItems(result.items, index, units), defaultSlotFor(new Date(), profile.slots).id, slots.map((s) => s.id));
      start({ text: query.trim(), understoodBy: result.label, items });
      router.push('/confirm');
    } finally {
      setBusy(false);
    }
  };

  const data = searching ? results : usual;

  return (
    <Screen title="Log">
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={(t) => {
          setQuery(t);
          setFailure(null);
        }}
        placeholder="Type what you ate, e.g. 2 roti and dal"
        placeholderTextColor={colors.muted}
        autoCorrect={false}
        autoCapitalize="none"
        multiline
        accessibilityLabel="Type what you ate or search foods"
      />
      <Button label={busy ? 'Reading…' : 'Log it with AI'} onPress={understand} disabled={!searching || busy} />
      {failure ? (
        <View style={styles.failure} accessibilityLiveRegion="polite">
          <Text style={styles.failureText}>{explainFailure(failure)}</Text>
          {failure.reason === 'no_providers' ? (
            <View style={{ marginTop: 8 }}>
              <Button label="Set up AI" variant="secondary" onPress={() => router.push('/manage/providers')} />
            </View>
          ) : null}
        </View>
      ) : null}

      {!searching && usual.length > 0 ? <Text style={styles.section}>Your usual foods</Text> : null}
      {!searching && usual.length === 0 ? (
        <Text style={styles.empty}>Type a food name to find it, or describe a meal and tap "Log it with AI".</Text>
      ) : null}
      {searching ? <Text style={styles.section}>Pick a food</Text> : null}
      {searching && results.length === 0 ? <Text style={styles.empty}>No foods found</Text> : null}
      <FlatList
        data={data}
        keyExtractor={(f) => f.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Log ${item.name}`}
            onPress={() => router.push({ pathname: '/entry', params: { foodId: item.id } })}
            style={styles.row}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>
                {item.unit === 'g' ? 'per 100 g' : `per ${item.unit} (${Math.round(item.gramsPerUnit)} g)`} ·{' '}
                {Math.round((item.kcalPer100g * item.gramsPerUnit) / (item.unit === 'g' ? 1 : 100))} kcal
              </Text>
            </View>
          </Pressable>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.text, backgroundColor: '#fff', marginBottom: 8, minHeight: 48, maxHeight: 120 },
  failure: { backgroundColor: '#FFF4E5', borderRadius: 10, padding: 12, marginTop: 10 },
  failureText: { color: '#7A4A00', fontSize: 14, lineHeight: 20 },
  section: { color: colors.muted, fontSize: 13, marginVertical: 8 },
  empty: { color: colors.muted, fontSize: 15, paddingVertical: 12 },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  name: { fontSize: 16, color: colors.text },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
