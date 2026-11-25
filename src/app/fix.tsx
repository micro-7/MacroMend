import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { todayKey } from '@/core/day';
import { openSlotIds, rebalance, shufflePlan, swapItem, type Plan, type PlanItem, type RebalanceInput, type StapleInfo } from '@/core/rebalance';
import { summarize } from '@/core/summary';
import { useDay } from '@/db/DayContext';
import { useDb } from '@/db/DbContext';
import { logFood } from '@/db/logs';
import { logHaptic } from '@/ui/haptics';
import { useProfile } from '@/db/ProfileContext';
import { listStaples, toStapleInfo } from '@/db/staples';
import { PlanView } from '@/ui/PlanView';
import { Screen } from '@/ui/Screen';

/** "Fix my day": rebuild the open meals from the user's usual foods. Everything is computed on the phone. */
export default function FixMyDay() {
  const router = useRouter();
  const db = useDb();
  const { profile } = useProfile();
  const day = useDay();
  const [staples, setStaples] = useState<StapleInfo[] | null>(null);
  const [seed, setSeed] = useState(1);
  const [swapped, setSwapped] = useState<Plan | null>(null);

  useEffect(() => {
    let cancelled = false;
    listStaples(db).then((rows) => {
      if (!cancelled) setStaples(rows.map(toStapleInfo));
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const input: RebalanceInput | null = useMemo(() => {
    if (!profile || !staples) return null;
    const summary = summarize(day.logs, { kcal: profile.kcalTarget, proteinG: profile.proteinTargetG }, profile.slots);
    return {
      remainingKcal: summary.remainingKcal,
      remainingProteinG: summary.remainingProteinG,
      openSlotIds: openSlotIds(profile.slots, day.logs),
      staples,
      dietType: profile.dietType,
      seed,
    };
  }, [profile, staples, day.logs, seed]);

  const base = useMemo(() => (input ? rebalance(input) : null), [input]);
  // A swap is kept only until anything it was based on changes (a log, a shuffle, new staples).
  useEffect(() => setSwapped(null), [base]);

  if (!profile || !input || !base) return null;
  const plan = swapped ?? base;
  const slotNames = Object.fromEntries(profile.slots.map((s) => [s.id, s.name]));

  const fail = (e: unknown) => Alert.alert("Couldn't log that", e instanceof Error ? e.message : String(e));

  const logItems = async (slotId: string, items: PlanItem[]) => {
    try {
      for (const i of items) {
        await logFood(db, { date: todayKey(), slot: slotId, foodId: i.foodId, qty: i.qty, unit: i.unit });
      }
      await day.reload();
      void logHaptic();
    } catch (e) {
      await day.reload();
      fail(e);
    }
  };

  return (
    <Screen title="Your plan for today">
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <PlanView
          plan={plan}
          slotNames={slotNames}
          remaining={{ kcal: input.remainingKcal, proteinG: input.remainingProteinG }}
          onSwap={(slotId, index) => {
            const next = swapItem(input, plan, slotId, index);
            if (next) setSwapped(next);
            else Alert.alert('Nothing to swap in', 'You have no other usual food of this kind that fits. Add more in Settings → Usual foods.');
          }}
          onLogItem={(slotId, item) => logItems(slotId, [item])}
          onLogSlot={(slotId) => logItems(slotId, plan.slots.find((s) => s.slotId === slotId)?.items ?? [])}
          onShuffle={() => {
            const r = shufflePlan(input, plan);
            setSeed(r.seed);
            setSwapped(null);
          }}
          onOpenStaples={() => router.push('/manage/staples')}
        />
      </ScrollView>
    </Screen>
  );
}
