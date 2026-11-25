import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { TextInput } from '@/ui/TextInput';
import { Text } from '@/ui/Text';
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
import { Feather } from '@expo/vector-icons';
import { EmptyState, SectionHeader } from '@/ui/components';
import { Button } from '@/ui/kit';
import { OnlineFoodFlow } from '@/ui/OnlineFoodFlow';
import { usePhoneModelOptional } from '@/phone/PhoneModelContext';
import { useLookupServices } from '@/lookup/useLookupServices';
import { Screen } from '@/ui/Screen';
import { palette, radius } from '@/ui/theme';

export default function LogScreen() {
  const router = useRouter();
  const db = useDb();
  const { profile } = useProfile();
  const { start } = useParseSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodRow[]>([]);
  const [usual, setUsual] = useState<FoodRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const services = useLookupServices();
  const phone = usePhoneModelOptional();
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
    setNotice(null);
    try {
      const slots = profile.slots.map((s) => ({ id: s.id, name: s.name }));
      const result = await runChain(
        { db, keys: secureKeyStore, isOnline, phone: phone?.chainPhone, phoneOnly: phone?.getPhoneOnly },
        query.trim(), { slots },
      );
      if (!result.ok) return setFailure(result);
      if (result.items.length === 0) return setNotice(`${result.label} couldn't find any food in that text. Check the spelling, or pick the food below.`);
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
          setNotice(null);
        }}
        placeholder="Type what you ate, e.g. 2 roti and dal"
        placeholderTextColor={palette.muted}
        autoCorrect={false}
        autoCapitalize="none"
        multiline
        accessibilityLabel="Type what you ate or search foods"
      />
      <Button label={busy ? 'Reading…' : 'Log it with AI'} onPress={understand} disabled={!searching || busy} />
      {notice ? (
        <View style={styles.failure} accessibilityLiveRegion="polite">
          <Text style={styles.failureText}>{notice}</Text>
        </View>
      ) : null}
      {failure ? (
        <View style={styles.failure} accessibilityLiveRegion="polite">
          <Text style={styles.failureText}>{explainFailure(failure)}</Text>
          {failure.reason === 'phone_unavailable' ? (
            <View style={{ marginTop: 8 }}>
              <Button label="Phone model settings" variant="secondary" onPress={() => router.push('/manage/phone')} />
            </View>
          ) : null}
          {failure.reason === 'no_providers' ? (
            <View style={{ marginTop: 8 }}>
              <Button label="Set up AI" variant="secondary" onPress={() => router.push('/manage/providers')} />
            </View>
          ) : null}
        </View>
      ) : null}

      {!searching && usual.length > 0 ? <SectionHeader title="Your usual foods" /> : null}
      {!searching && usual.length === 0 ? (
        <EmptyState message='Type a food name to find it, or describe a meal and tap "Log it with AI".' />
      ) : null}
      {searching ? <SectionHeader title="Pick a food" /> : null}
      {searching && results.length === 0 ? (
        <EmptyState message="No foods found">
          <Button label="Search online" variant="secondary" onPress={() => setOnline(true)} />
        </EmptyState>
      ) : null}
      <FlatList
        data={data}
        keyExtractor={(f) => f.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Log ${item.name}`}
            onPress={() => router.push({ pathname: '/entry', params: { foodId: item.id } })}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>
                {item.unit === 'g' ? 'per 100 g' : `per ${item.unit} (${Math.round(item.gramsPerUnit)} g)`} ·{' '}
                {Math.round((item.kcalPer100g * item.gramsPerUnit) / (item.unit === 'g' ? 1 : 100))} kcal
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={palette.muted} />
          </Pressable>
        )}
        contentContainerStyle={{ paddingBottom: 120, gap: 8 }}
      />
      <OnlineFoodFlow
        visible={online}
        query={query.trim()}
        services={services}
        onClose={() => setOnline(false)}
        onSaved={(f) => {
          setOnline(false);
          router.push({ pathname: '/entry', params: { foodId: f.id } });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: palette.text,
    backgroundColor: palette.card,
    marginBottom: 10,
    minHeight: 52,
    maxHeight: 120,
  },
  failure: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.warning, borderRadius: radius.card, padding: 14, marginTop: 10 },
  failureText: { color: palette.text, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.card, borderRadius: radius.card, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.border },
  name: { fontSize: 16, color: palette.text },
  sub: { fontSize: 12, color: palette.muted, marginTop: 2 },
});
