import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { FoodCategory } from '@/core/diet';
import { useDb } from '@/db/DbContext';
import type { FoodRow } from '@/db/foods';
import { createFood, saveExternalFood } from '@/db/userFoods';
import { EMPTY_FOOD_FORM, fromEstimate, type FoodFormValues } from '@/lookup/foodForm';
import type { EstimateResult } from '@/lookup/estimate';
import type { OnlineSearchResult } from '@/lookup/search';
import type { LookupServices } from '@/lookup/services';
import type { LookupResult } from '@/lookup/types';
import { FoodForm } from './forms/FoodForm';
import { Button, Chip, Hint } from './kit';
import { palette } from './theme';

type Step =
  | { name: 'results' }
  | { name: 'category'; result: LookupResult }
  | { name: 'estimating' }
  | { name: 'form'; mode: 'estimate' | 'manual'; initial: FoodFormValues; notice: string };

const CATEGORIES: { id: FoodCategory; label: string }[] = [
  { id: 'veg', label: 'Vegetarian' },
  { id: 'egg', label: 'Egg' },
  { id: 'non-veg', label: 'Non-veg' },
  { id: 'vegan', label: 'Vegan' },
];

export const ATTRIBUTION = 'Food data from USDA FoodData Central (public domain) and Open Food Facts (ODbL licence).';
const SOURCE_LABEL = { usda: 'USDA', openfoodfacts: 'Open Food Facts' } as const;

/**
 * Find a food that is not in the table: search USDA and Open Food Facts, or ask the AI for an estimate, or type
 * the values in. Whatever the user picks is saved to their food table and handed back through `onSaved`.
 */
export function OnlineFoodFlow({
  visible,
  query,
  services,
  onSaved,
  onClose,
}: {
  visible: boolean;
  query: string;
  services: LookupServices;
  onSaved: (food: FoodRow) => void;
  onClose: () => void;
}) {
  const db = useDb();
  const [step, setStep] = useState<Step>({ name: 'results' });
  const [search, setSearch] = useState<OnlineSearchResult | 'loading'>('loading');
  const [category, setCategory] = useState<FoodCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);

  // Start over each time the sheet opens or the words change (adjusting state while rendering, as React recommends)…
  const openKey = visible ? query : null;
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null);
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    if (openKey !== null) {
      setStep({ name: 'results' });
      setSearch('loading');
      setError(null);
    }
  }

  // …and search for the typed words.
  useEffect(() => {
    if (!visible) return;
    const id = ++runId.current;
    services.search(query).then((r) => {
      if (runId.current === id) setSearch(r);
    });
  }, [visible, query, services]);

  const finish = async (save: () => Promise<FoodRow>) => {
    setBusy(true);
    setError(null);
    try {
      onSaved(await save());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const startEstimate = async () => {
    const id = ++runId.current;
    setStep({ name: 'estimating' });
    const r: EstimateResult = await services.estimate(query);
    if (runId.current !== id) return;
    if (r.ok) {
      setStep({ name: 'form', mode: 'estimate', initial: fromEstimate(r.estimate), notice: 'Estimated by AI — check before saving' });
    } else {
      setStep({ name: 'form', mode: 'manual', initial: { ...EMPTY_FOOD_FORM, name: query.trim() }, notice: r.message });
    }
  };

  const manual = (notice: string) =>
    setStep({ name: 'form', mode: 'manual', initial: { ...EMPTY_FOOD_FORM, name: query.trim() }, notice });

  const body = () => {
    if (step.name === 'estimating') {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={palette.brandBright} />
          <Text style={styles.muted}>Asking your AI for an estimate…</Text>
        </View>
      );
    }

    if (step.name === 'category') {
      const r = step.result;
      return (
        <View style={styles.pad}>
          <Text style={styles.title}>{r.brand ? `${r.name} (${r.brand})` : r.name}</Text>
          <Text style={styles.muted}>
            {Math.round(r.kcalPer100g)} kcal · {r.proteinPer100g} g protein per 100 g{r.servingLabel ? ` · serving ${r.servingLabel}` : ''}
          </Text>
          <Text style={[styles.label, { marginTop: 16 }]}>What kind of food is it?</Text>
          <Hint>This helps with your diet filter. {r.category ? 'We guessed from the product, please check.' : "We couldn't tell from the product."}</Hint>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <Chip key={c.id} label={c.label} selected={category === c.id} onPress={() => setCategory(c.id)} />
            ))}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={{ marginTop: 20 }}>
            <Button
              label={busy ? 'Saving…' : 'Save and use'}
              disabled={!category || busy}
              onPress={() => finish(() => saveExternalFood(db, r, { category: category!, searchedName: query }))}
            />
          </View>
          <View style={{ marginTop: 8 }}>
            <Button label="Back to results" variant="secondary" onPress={() => setStep({ name: 'results' })} />
          </View>
        </View>
      );
    }

    if (step.name === 'form') {
      return (
        <View style={styles.pad}>
          <FoodForm
            initial={step.initial}
            banner={step.notice}
            submitLabel={step.mode === 'estimate' ? 'Save estimate and use' : 'Save and use'}
            busy={busy}
            error={error}
            onSubmit={(food) =>
              finish(() =>
                createFood(db, { ...food, aliases: [query], source: step.mode === 'estimate' ? 'ai-estimated' : 'user' }),
              )
            }
            onCancel={() => setStep({ name: 'results' })}
          />
        </View>
      );
    }

    // results
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.pad}>
          <Text style={styles.title}>Search online</Text>
          <Text style={styles.muted}>Looking for “{query}”. Only these words are sent.</Text>
        </View>
        {search === 'loading' ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.brandBright} />
            <Text style={styles.muted}>Searching USDA and Open Food Facts…</Text>
          </View>
        ) : !search.ok ? (
          <View style={styles.pad}>
            <Text style={styles.message}>{search.message}</Text>
            <View style={{ marginTop: 12, gap: 8 }}>
              <Button label="Estimate with AI" variant="secondary" onPress={startEstimate} />
              <Button label="Enter the values myself" variant="secondary" onPress={() => manual('Enter the values from the packet or your best knowledge.')} />
            </View>
          </View>
        ) : (
          <FlatList
            data={search.results}
            keyExtractor={(r) => r.externalId}
            contentContainerStyle={{ paddingBottom: 12 }}
            ListHeaderComponent={
              search.usdaError || search.offError ? (
                <Text style={[styles.muted, styles.pad]}>
                  {search.usdaError ? 'USDA could not be searched right now. ' : ''}
                  {search.offError ? 'Open Food Facts could not be searched right now.' : ''}
                </Text>
              ) : undefined
            }
            ListEmptyComponent={<Text style={[styles.message, styles.pad]}>Nothing found for “{query}”.</Text>}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Pick ${item.name}`}
                onPress={() => {
                  setCategory(item.category);
                  setError(null);
                  setStep({ name: 'category', result: item });
                }}
                style={styles.row}
              >
                <Text style={styles.rowName}>{item.brand ? `${item.name} (${item.brand})` : item.name}</Text>
                <Text style={styles.muted}>
                  {Math.round(item.kcalPer100g)} kcal · {item.proteinPer100g} g protein per 100 g
                </Text>
                <Text style={styles.source}>{SOURCE_LABEL[item.source]}</Text>
              </Pressable>
            )}
            ListFooterComponent={
              <View style={styles.pad}>
                <Button label="None of these" variant="secondary" onPress={startEstimate} />
                <View style={{ marginTop: 8 }}>
                  <Button label="Enter the values myself" variant="secondary" onPress={() => manual('Enter the values from the packet or your best knowledge.')} />
                </View>
              </View>
            }
          />
        )}
        <Text style={styles.attribution}>{ATTRIBUTION}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1 }}>{body()}</View>
        <View style={styles.foot}>
          <Button label="Close" variant="secondary" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  pad: { padding: 16 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: palette.text },
  muted: { color: palette.muted, fontSize: 14, marginTop: 2 },
  label: { fontSize: 15, fontWeight: '600', color: palette.text },
  message: { fontSize: 16, color: palette.text, lineHeight: 23 },
  error: { color: palette.danger, marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  rowName: { fontSize: 16, color: palette.text },
  source: { fontSize: 12, color: palette.brandBright, marginTop: 4, fontWeight: '600' },
  attribution: { fontSize: 11, color: palette.muted, paddingHorizontal: 16, paddingBottom: 6 },
  foot: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border },
});
