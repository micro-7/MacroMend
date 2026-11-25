import { DEFAULT_SLOTS } from '../../core/slots';
import { openSlotIds, rebalance, type RebalanceInput } from '../../core/rebalance';
import { summarize } from '../../core/summary';
import { seedCatalog } from '../foods';
import { listLogs, logFood } from '../logs';
import { migrate } from '../migrations';
import { completeOnboarding } from '../profile';
import { listStaples, toStapleInfo } from '../staples';
import { createTestDb } from '../testDb';

const DAY = '2026-11-25';
const targets = { kcal: 1800, proteinG: 120 };

async function setup() {
  const db = createTestDb();
  await migrate(db);
  await seedCatalog(db);
  await completeOnboarding(
    db,
    { goal: 'maintain', dietType: 'veg', weightKg: null, heightCm: null, age: null, sex: null, activity: null, kcalTarget: 1800, proteinTargetG: 120, slots: DEFAULT_SLOTS },
    [
      { foodId: 'in-paneer', usualQty: 100, usualUnit: 'g' },
      { foodId: 'in-whey', usualQty: 1, usualUnit: 'scoop' },
      { foodId: 'in-roti', usualQty: 2, usualUnit: 'piece' },
      { foodId: 'in-rice', usualQty: 1, usualUnit: 'katori' },
      { foodId: 'usda-chicken-breast', usualQty: 150, usualUnit: 'g' },
    ],
  );
  return db;
}

async function planFor(db: Awaited<ReturnType<typeof setup>>, seed = 1) {
  const logs = await listLogs(db, DAY);
  const s = summarize(logs, targets, DEFAULT_SLOTS);
  const staples = (await listStaples(db)).map(toStapleInfo);
  const input: RebalanceInput = {
    remainingKcal: s.remainingKcal, remainingProteinG: s.remainingProteinG,
    openSlotIds: openSlotIds(DEFAULT_SLOTS, logs), staples, dietType: 'veg', seed,
  };
  return { input, plan: rebalance(input), summary: s };
}

describe('Fix my day end to end (database, no AI)', () => {
  it('suggests all four meals on an empty day, never chicken for a vegetarian, within the calories', async () => {
    const db = await setup();
    const { plan } = await planFor(db);
    expect(plan.reason).toBeNull();
    expect(plan.slots.map((s) => s.slotId)).toEqual(['breakfast', 'lunch', 'snack', 'dinner']);
    expect(plan.slots.every((s) => s.items.some((i) => i.role === 'protein'))).toBe(true);
    expect(plan.slots.flatMap((s) => s.items).some((i) => i.name === 'chicken breast')).toBe(false);
    expect(plan.totalKcal).toBeLessThanOrEqual(1800 + 1e-6);
  });

  it('logging the Snack suggestion saves it, closes Snack and updates what is left', async () => {
    const db = await setup();
    const before = await planFor(db);
    const snack = before.plan.slots.find((s) => s.slotId === 'snack')!;
    for (const i of snack.items) {
      await logFood(db, { date: DAY, slot: 'snack', foodId: i.foodId, qty: i.qty, unit: i.unit });
    }
    const after = await planFor(db);
    expect(after.plan.slots.map((s) => s.slotId)).toEqual(['breakfast', 'lunch', 'dinner']);
    expect(after.summary.remainingKcal).toBeCloseTo(1800 - snack.kcal, 6);
    expect(after.summary.remainingProteinG).toBeCloseTo(120 - snack.proteinG, 6);
    expect(after.plan.totalKcal).toBeLessThanOrEqual(after.summary.remainingKcal + 1e-6);
    const logged = (await listLogs(db, DAY)).filter((l) => l.slot === 'snack');
    expect(logged.map((l) => [l.foodId, l.qty])).toEqual(snack.items.map((i) => [i.foodId, i.qty]));
  });

  it('says there is nothing to fix once every meal has something logged', async () => {
    const db = await setup();
    for (const s of DEFAULT_SLOTS) await logFood(db, { date: DAY, slot: s.id, foodId: 'in-roti', qty: 1, unit: 'piece' });
    expect((await planFor(db)).plan.reason).toBe('no_open_slots');
  });

  it('says the calorie target is reached once the day is over target', async () => {
    const db = await setup();
    await logFood(db, { date: DAY, slot: 'lunch', foodId: 'in-rice', qty: 50, unit: 'katori' }); // 50 x 195 kcal
    expect((await planFor(db)).plan.reason).toBe('kcal_reached');
  });

  it('works without any network (it only reads the local database)', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error('network used');
    }) as typeof fetch;
    try {
      const db = await setup();
      expect((await planFor(db)).plan.reason).toBeNull();
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
