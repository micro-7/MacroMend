import { splitReady, toConfirmItems, withFood, type ConfirmFood } from '../../ai/confirm';
import { memoryKeyStore } from '../../ai/keyStore';
import { createProvider, defaultsFor } from '../../ai/providerService';
import { resolveItems } from '../../ai/resolve';
import { chatOk, res } from '../../ai/testing';
import { DEFAULT_SLOTS } from '../../core/slots';
import { getFoodsByIds, loadMatchData, seedCatalog } from '../../db/foods';
import { listLogs, logFood } from '../../db/logs';
import { migrate } from '../../db/migrations';
import { setOnlineLookupEnabled } from '../../db/settings';
import { createTestDb } from '../../db/testDb';
import { createFood, listSavedFoods, saveExternalFood, updateFood } from '../../db/userFoods';
import { OFF_REAL } from '../__fixtures__/responses';
import { estimateFood } from '../estimate';
import { realServices } from '../services';

const DAY = '2026-11-25';
const slotIds = DEFAULT_SLOTS.map((s) => s.id);

async function setup() {
  const db = createTestDb();
  await migrate(db);
  await seedCatalog(db);
  const keys = memoryKeyStore();
  await createProvider(db, keys, { ...defaultsFor('groq'), apiKey: 'gsk_key' });
  return { db, keys };
}

const toFood = (f: { id: string; name: string; unit: string; gramsPerUnit: number; kcalPer100g: number; proteinPer100g: number }): ConfirmFood => f;

/** What the confirm screen does with the AI's reply, without the screen. */
async function resolve(db: Awaited<ReturnType<typeof setup>>['db'], reply: { name: string; qty?: number; unit?: string }[]) {
  const { index, units } = await loadMatchData(db);
  return toConfirmItems(resolveItems(reply.map((r) => ({ name: r.name, qty: r.qty ?? 1, unit: r.unit ?? '', slot: '' })), index, units), 'snack', slotIds);
}

describe('a branded food that is not in the table', () => {
  it('is not found at first, found online, saved, logged, and matched offline next time', async () => {
    const { db, keys } = await setup();

    // 1. "1 scoop muscleblaze whey" is not in the bundled table
    const [first] = await resolve(db, [{ name: 'muscleblaze whey', qty: 1, unit: 'scoop' }]);
    expect(first.foodId).toBeNull();

    // 2. search online (OFF answers; USDA is rate limited) and pick the first result
    const fetchFn = jest.fn(async (url: string) => (String(url).includes('openfoodfacts') ? res(200, OFF_REAL) : res(429, 'slow down'))) as unknown as typeof fetch;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchFn;
    let search;
    try {
      search = await realServices(db, '1.0.0', keys).search('muscleblaze whey');
    } finally {
      globalThis.fetch = originalFetch;
    }
    // (with no network info available in tests, the app assumes the phone is online and lets the request decide)
    expect(search).toMatchObject({ ok: true, usdaError: 'rate_limit' });
    const picked = search.ok ? search.results[0] : null;
    expect(picked).toMatchObject({ source: 'openfoodfacts' });

    // 3. the user confirms the category; the food is saved and used for the log
    const saved = await saveExternalFood(db, picked!, { category: 'veg', searchedName: 'muscleblaze whey' });
    const [row] = await getFoodsByIds(db, [saved.id]);
    const item = withFood(first, toFood(row));
    const { ready, pending } = splitReady([item], new Map([[row.id, toFood(row)]]));
    expect(pending).toEqual([]);
    await logFood(db, { date: DAY, slot: ready[0].item.slot, foodId: ready[0].foodId, qty: ready[0].qty, unit: ready[0].unit, rawText: '1 scoop muscleblaze whey' });
    expect((await listLogs(db, DAY))[0]).toMatchObject({ foodName: expect.stringContaining('cruesly'), estimated: false });

    // 4. next time, with no network at all, the same words are matched from the phone
    const noNetwork = jest.fn(() => {
      throw new Error('network used');
    }) as unknown as typeof fetch;
    globalThis.fetch = noNetwork;
    try {
      const [again] = await resolve(db, [{ name: 'muscleblaze whey', qty: 1, unit: 'scoop' }]);
      expect(again).toMatchObject({ foodId: saved.id, matchKind: 'exact' });
      expect(noNetwork).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('does not search at all when online lookup is switched off', async () => {
    const { db, keys } = await setup();
    await setOnlineLookupEnabled(db, false);
    const spy = jest.fn() as unknown as typeof fetch;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = spy;
    try {
      expect(await realServices(db, '1.0.0', keys).search('anything')).toMatchObject({ ok: false, reason: 'disabled' });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('a food that is nowhere: AI estimate', () => {
  const REPLY = '{"name":"Dhaba butter chicken","kcal_per_100g":170,"protein_per_100g":12,"unit":"plate","grams_per_unit":300,"category":"non-veg"}';

  it('is estimated, saved as ai-estimated, logged with the est. mark, then checked so new entries are not marked', async () => {
    const { db, keys } = await setup();
    const fetchFn = jest.fn().mockResolvedValue(chatOk(REPLY)) as unknown as typeof fetch;
    const est = await estimateFood({ db, keys, isOnline: async () => true, call: { fetchFn } }, 'dhaba butter chicken');
    expect(est.ok).toBe(true);
    if (!est.ok) return;

    const food = await createFood(db, { ...est.estimate, aliases: ['dhaba butter chicken'], source: 'ai-estimated' });
    const first = await logFood(db, { date: DAY, slot: 'dinner', foodId: food.id, qty: 1, unit: 'plate' });
    expect(first.estimated).toBe(true);
    expect(first.kcal).toBeCloseTo(510, 5);

    await updateFood(db, food.id, { name: food.name, aliases: food.aliases, category: 'non-veg', unit: 'plate', gramsPerUnit: 300, kcalPer100g: 165, proteinPer100g: 12, checked: true });
    const second = await logFood(db, { date: DAY, slot: 'dinner', foodId: food.id, qty: 1, unit: 'plate' });
    expect(second.estimated).toBe(false);
    expect((await listLogs(db, DAY)).map((l) => l.estimated)).toEqual([true, false]);
    expect((await listSavedFoods(db))[0].source).toBe('user');
  });
});
