import { DEFAULT_SLOTS } from '../../core/slots';
import { defaultSlotFor, todayKey } from '../../core/day';
import { loadMatchData, getFoodsByIds, seedCatalog } from '../../db/foods';
import { listLogs, logFood } from '../../db/logs';
import { migrate } from '../../db/migrations';
import { providerStatus, listProviders } from '../../db/providers';
import { summarize } from '../../core/summary';
import { createTestDb } from '../../db/testDb';
import { runChain } from '../chain';
import { splitReady, toConfirmItems, type ConfirmFood } from '../confirm';
import { memoryKeyStore } from '../keyStore';
import { createProvider, defaultsFor } from '../providerService';
import { resolveItems } from '../resolve';
import { chatOk, res } from '../testing';

const NOW = new Date(2026, 10, 25, 13, 30, 0);

async function setup() {
  const db = createTestDb();
  await migrate(db);
  await seedCatalog(db);
  const keys = memoryKeyStore();
  // The first provider has a wrong key, the second works (the phone checklist scenario).
  const bad = await createProvider(db, keys, { ...defaultsFor('gemini'), apiKey: 'wrong-key' });
  const good = await createProvider(db, keys, { ...defaultsFor('groq'), apiKey: 'right-key' });
  return { db, keys, bad, good };
}

/** Same steps as the Log tab and the confirm screen. */
async function typeAndLog(s: Awaited<ReturnType<typeof setup>>, text: string, reply: string) {
  const fetchFn = jest.fn(async (url: string) => (String(url).includes('generativelanguage') ? res(401, 'API key not valid') : chatOk(reply))) as unknown as typeof fetch;
  const slots = DEFAULT_SLOTS.map((x) => ({ id: x.id, name: x.name }));
  const chain = await runChain({ db: s.db, keys: s.keys, isOnline: async () => true, now: () => NOW, call: { fetchFn } }, text, { slots });
  if (!chain.ok) return { chain };
  const { index, units } = await loadMatchData(s.db);
  const items = toConfirmItems(resolveItems(chain.items, index, units), defaultSlotFor(NOW, DEFAULT_SLOTS).id, slots.map((x) => x.id));
  const rows = await getFoodsByIds(s.db, items.flatMap((i) => (i.foodId ? [i.foodId] : [])));
  const foods = new Map<string, ConfirmFood>(rows.map((f) => [f.id, f]));
  const { ready, pending } = splitReady(items, foods);
  for (const r of ready) await logFood(s.db, { date: todayKey(NOW), slot: r.item.slot, foodId: r.foodId, qty: r.qty, unit: r.unit, rawText: text });
  return { chain, items, ready, pending };
}

describe('typing a meal, end to end', () => {
  it('skips the provider with the wrong key, understands Hinglish, logs from the food table and keeps the typed text', async () => {
    const s = await setup();
    const out = await typeAndLog(s, 'office mein 2 samosa kha liye', '{"items":[{"name":"samosa","qty":2,"unit":"","slot":""}]}');
    expect(out.chain).toMatchObject({ ok: true, label: 'Groq' });
    expect(out.chain.attempts.map((a) => a.outcome)).toEqual(['auth', 'ok']);
    const logs = await listLogs(s.db, todayKey(NOW));
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ foodName: 'samosa', qty: 2, unit: 'piece', grams: 160, slot: 'lunch', rawText: 'office mein 2 samosa kha liye', estimated: false });
    expect(logs[0].kcal).toBeCloseTo(419.2, 5);
    const [gem] = await listProviders(s.db);
    expect(providerStatus(gem, NOW)).toBe('key_rejected');
  });

  it('logs Hinglish number words, a named meal and several foods at once', async () => {
    const s = await setup();
    const reply = '{"items":[{"name":"egg","qty":"do","unit":"","slot":"breakfast"},{"name":"dahi","qty":"ek","unit":"katori","slot":"breakfast"}]}';
    await typeAndLog(s, 'breakfast mein do anda aur ek katori dahi', reply);
    const logs = await listLogs(s.db, todayKey(NOW));
    expect(logs.map((l) => [l.foodName, l.qty, l.unit, l.slot])).toEqual([['egg', 2, 'piece', 'breakfast'], ['curd', 1, 'katori', 'breakfast']]);
  });

  it('highlights a typo, and leaves a not-found food unlogged until the user picks one', async () => {
    const s = await setup();
    const reply = '{"items":[{"name":"panner paratha","qty":2},{"name":"xylophone steak","qty":1}]}';
    const out = await typeAndLog(s, '2 panner paratha aur xylophone steak', reply);
    expect(out.items![0]).toMatchObject({ foodId: 'in-paneer-paratha', matchKind: 'fuzzy' });
    expect(out.pending!.map((p) => p.parsed.name)).toEqual(['xylophone steak']);
    expect((await listLogs(s.db, todayKey(NOW))).map((l) => l.foodName)).toEqual(['paneer paratha']);
  });

  it('never trusts calories sent by the AI', async () => {
    const s = await setup();
    await typeAndLog(s, '1 roti', '{"items":[{"name":"roti","qty":1,"kcal":5000,"protein_g":400}]}');
    const [l] = await listLogs(s.db, todayKey(NOW));
    expect(l.kcal).toBeCloseTo(118.8, 5);
    expect(l.proteinG).toBeCloseTo(3.92, 5);
  });

  it('updates what is left today after logging by typing', async () => {
    const s = await setup();
    await typeAndLog(s, '2 roti and dal', '{"items":[{"name":"roti","qty":2},{"name":"dal"}]}');
    const logs = await listLogs(s.db, todayKey(NOW));
    const sum = summarize(logs, { kcal: 1800, proteinG: 120 }, DEFAULT_SLOTS);
    expect(sum.eatenKcal).toBeCloseTo(237.6 + 135, 5);
    expect(sum.remainingKcal).toBeCloseTo(1800 - 237.6 - 135, 5);
  });

  it('says why when nothing can be used: offline, no providers', async () => {
    const s = await setup();
    const slots = [{ id: 'lunch', name: 'Lunch' }];
    const offline = await runChain({ db: s.db, keys: s.keys, isOnline: async () => false }, 'x', { slots });
    expect(offline).toMatchObject({ ok: false, reason: 'offline' });
    const empty = createTestDb();
    await migrate(empty);
    expect(await runChain({ db: empty, keys: memoryKeyStore(), isOnline: async () => true }, 'x', { slots })).toMatchObject({ ok: false, reason: 'no_providers' });
  });
});
