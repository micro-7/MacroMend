import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Text } from 'react-native';
import { splitReady, withFood, type ConfirmFood, type ConfirmItem } from '@/ai/confirm';
import { useParseSession } from '@/ai/ParseSession';
import { todayKey } from '@/core/day';
import { useDay } from '@/db/DayContext';
import { useDb } from '@/db/DbContext';
import { getFoodsByIds, type FoodRow } from '@/db/foods';
import { logFood } from '@/db/logs';
import { useProfile } from '@/db/ProfileContext';
import { ConfirmList } from '@/ui/ConfirmList';
import { FoodPicker } from '@/ui/FoodPicker';
import { Hint, StepScreen } from '@/ui/kit';
import { OnlineFoodFlow } from '@/ui/OnlineFoodFlow';
import { useLookupServices } from '@/lookup/useLookupServices';
import { colors } from '@/ui/theme';

const toConfirmFood = (f: FoodRow): ConfirmFood => ({
  id: f.id, name: f.name, unit: f.unit, gramsPerUnit: f.gramsPerUnit, kcalPer100g: f.kcalPer100g, proteinPer100g: f.proteinPer100g,
});

/** Check what the AI understood, fix anything, then log it. Nothing is saved before "Log". */
export default function ConfirmScreen() {
  const router = useRouter();
  const db = useDb();
  const day = useDay();
  const { profile } = useProfile();
  const { session, clear } = useParseSession();
  const [items, setItems] = useState<ConfirmItem[]>(() => session?.items ?? []);
  const [foods, setFoods] = useState<Map<string, ConfirmFood>>(new Map());
  const [picking, setPicking] = useState<string | null>(null);
  const [searching, setSearching] = useState<string | null>(null);
  const services = useLookupServices();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ids = [...new Set((session?.items ?? []).flatMap((i) => (i.foodId ? [i.foodId] : [])))];
    getFoodsByIds(db, ids).then((rows) => {
      if (!cancelled) setFoods(new Map(rows.map((f) => [f.id, toConfirmFood(f)])));
    });
    return () => {
      cancelled = true;
    };
  }, [db, session]);

  const { ready, pending } = useMemo(() => splitReady(items, foods), [items, foods]);

  if (!profile) return null;
  if (!session) {
    return (
      <StepScreen title="Nothing to check" onNext={() => router.back()} nextLabel="Close">
        <Text style={{ color: colors.muted }}>There is nothing waiting to be logged.</Text>
      </StepScreen>
    );
  }

  const patch = (key: string, p: Partial<ConfirmItem>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));
  const pickedItem = items.find((i) => i.key === picking);
  const searchedItem = items.find((i) => i.key === searching);

  const switchTo = async (key: string, foodId: string) => {
    let food = foods.get(foodId);
    if (!food) {
      const [row] = await getFoodsByIds(db, [foodId]);
      if (!row) return;
      food = toConfirmFood(row);
      setFoods((m) => new Map(m).set(food!.id, food!));
    }
    setItems((list) => list.map((i) => (i.key === key ? withFood(i, food!) : i)));
  };

  const cancel = () => {
    clear();
    router.back();
  };

  const logAll = async () => {
    setSaving(true);
    setError(null);
    setNote(null);
    try {
      for (const r of ready) {
        await logFood(db, { date: todayKey(), slot: r.item.slot, foodId: r.foodId, qty: r.qty, unit: r.unit, rawText: session.text });
      }
      await day.reload();
      if (pending.length === 0) {
        clear();
        router.dismissTo('/');
        return;
      }
      setItems(pending);
      setNote(`Logged ${ready.length} ${ready.length === 1 ? 'item' : 'items'}. Pick a food for the rest, or remove them.`);
      setSaving(false);
    } catch (e) {
      await day.reload();
      setError(`Couldn't log: ${e instanceof Error ? e.message : String(e)}`);
      setSaving(false);
    }
  };

  const confirmCancel = () =>
    items.length > 0 && !note
      ? Alert.alert('Discard this?', 'Nothing has been logged yet.', [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: cancel },
        ])
      : cancel();

  return (
    <StepScreen
      title="Check and log"
      onBack={confirmCancel}
      onNext={logAll}
      nextLabel={saving ? 'Logging…' : ready.length === 0 ? 'Log' : `Log ${ready.length} ${ready.length === 1 ? 'item' : 'items'}`}
      nextDisabled={saving || ready.length === 0}
      error={error}
    >
      <Hint>Understood by: {session.understoodBy}. Nothing is saved until you tap Log. Calories and protein come from the food table.</Hint>
      {note ? <Text style={{ color: colors.primary, marginBottom: 10 }}>{note}</Text> : null}
      {items.length === 0 ? <Text style={{ color: colors.muted }}>Nothing left to log.</Text> : null}
      <ConfirmList
        items={items}
        foods={foods}
        slots={profile.slots}
        onChange={patch}
        onRemove={(key) => setItems((list) => list.filter((i) => i.key !== key))}
        onPickFood={setPicking}
        onSearchOnline={setSearching}
        onSwitchFood={switchTo}
      />
      <OnlineFoodFlow
        visible={searching !== null}
        query={searchedItem?.parsed.name ?? ''}
        services={services}
        onClose={() => setSearching(null)}
        onSaved={(f) => {
          const key = searching;
          setSearching(null);
          if (key) {
            const food = toConfirmFood(f);
            setFoods((m) => new Map(m).set(food.id, food));
            setItems((list) => list.map((i) => (i.key === key ? withFood(i, food) : i)));
          }
        }}
      />
      <FoodPicker
        visible={picking !== null}
        initialQuery={pickedItem?.parsed.name ?? ''}
        onClose={() => setPicking(null)}
        onPick={(f) => {
          const key = picking;
          setPicking(null);
          if (key) {
            setFoods((m) => new Map(m).set(f.id, toConfirmFood(f)));
            setItems((list) => list.map((i) => (i.key === key ? withFood(i, toConfirmFood(f)) : i)));
          }
        }}
      />
    </StepScreen>
  );
}
