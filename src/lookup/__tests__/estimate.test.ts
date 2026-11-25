import { chatOk, res } from '../../ai/testing';
import { memoryKeyStore } from '../../ai/keyStore';
import { createProvider, defaultsFor } from '../../ai/providerService';
import { migrate } from '../../db/migrations';
import { getProvider, providerStatus } from '../../db/providers';
import { createTestDb } from '../../db/testDb';
import { buildEstimateMessages, estimateFood, parseEstimate } from '../estimate';

const GOOD = '{"name":"Dhaba butter chicken","kcal_per_100g":170,"protein_per_100g":12,"unit":"plate","grams_per_unit":300,"category":"non-veg"}';

describe('parseEstimate', () => {
  it('accepts a valid estimate', () => {
    expect(parseEstimate(GOOD, 'dhaba butter chicken')).toEqual({
      ok: true,
      estimate: { name: 'Dhaba butter chicken', kcalPer100g: 170, proteinPer100g: 12, unit: 'plate', gramsPerUnit: 300, category: 'non-veg' },
    });
  });

  it('rejects 50 kcal with 40 g protein per 100 g', () => {
    const r = parseEstimate('{"kcal_per_100g":50,"protein_per_100g":40,"unit":"g","grams_per_unit":1,"category":"veg"}', 'x');
    expect(r).toMatchObject({ ok: false });
    expect(r.ok === false && r.reason).toMatch(/doesn't fit/);
  });

  it.each([
    ['calories over 900', '{"kcal_per_100g":950,"protein_per_100g":10}'],
    ['negative calories', '{"kcal_per_100g":-5,"protein_per_100g":1}'],
    ['protein over 100', '{"kcal_per_100g":400,"protein_per_100g":120}'],
    ['not JSON', 'about 200 calories I think'],
    ['missing protein', '{"kcal_per_100g":100}'],
    ['words for numbers', '{"kcal_per_100g":"lots","protein_per_100g":"some"}'],
    ['unrealistic portion', '{"kcal_per_100g":100,"protein_per_100g":5,"unit":"plate","grams_per_unit":9000}'],
    ['unknown category', '{"kcal_per_100g":100,"protein_per_100g":5,"category":"meat"}'],
  ])('rejects: %s', (_n, text) => {
    expect(parseEstimate(text, 'x').ok).toBe(false);
  });

  it('accepts numbers given as text, and rounds them', () => {
    const r = parseEstimate('{"kcal_per_100g":"170.4","protein_per_100g":"11.96","unit":"katori","grams_per_unit":"150","category":"veg"}', 'dal');
    expect(r.ok && r.estimate).toMatchObject({ kcalPer100g: 170, proteinPer100g: 12, gramsPerUnit: 150 });
  });

  it('falls back to grams, the typed name and a guessed category when the model leaves them out', () => {
    const r = parseEstimate('{"kcal_per_100g":120,"protein_per_100g":10}', 'chicken tikka');
    expect(r.ok && r.estimate).toMatchObject({ name: 'chicken tikka', unit: 'g', gramsPerUnit: 1, category: 'non-veg' });
    const v = parseEstimate('{"kcal_per_100g":120,"protein_per_100g":3}', 'mystery dish');
    expect(v.ok && v.estimate.category).toBe('veg');
  });

  it('reads JSON inside a code fence', () => {
    expect(parseEstimate('```json\n' + GOOD + '\n```', 'x').ok).toBe(true);
  });
});

describe('buildEstimateMessages', () => {
  it('asks only about the food name and says the numbers must be realistic', () => {
    const m = buildEstimateMessages('  dhaba butter chicken ');
    expect(m[1]).toEqual({ role: 'user', content: 'dhaba butter chicken' });
    expect(m[0].content).toContain('protein x 4 can never be more than the calories');
    expect(m[0].content).toContain('"kcal_per_100g"');
  });
});

describe('estimateFood', () => {
  async function setup(kinds: ('gemini' | 'groq')[] = ['gemini']) {
    const db = createTestDb();
    await migrate(db);
    const keys = memoryKeyStore();
    const rows = [];
    for (const k of kinds) rows.push(await createProvider(db, keys, { ...defaultsFor(k), apiKey: `key-${k}` }));
    const deps = (fetchFn: unknown, online = true) => ({ db, keys, isOnline: async () => online, now: () => new Date(2026, 10, 25, 12), call: { fetchFn: fetchFn as typeof fetch } });
    return { db, keys, rows, deps };
  }

  it('returns a usable estimate and which provider made it', async () => {
    const s = await setup();
    const fetchFn = jest.fn().mockResolvedValue(chatOk(GOOD));
    const r = await estimateFood(s.deps(fetchFn), 'dhaba butter chicken');
    expect(r).toMatchObject({ ok: true, label: 'Google Gemini', estimate: { kcalPer100g: 170, unit: 'plate', gramsPerUnit: 300 } });
    expect(JSON.parse(fetchFn.mock.calls[0][1].body).messages[1].content).toBe('dhaba butter chicken');
  });

  it('throws away impossible numbers and says to enter the values yourself', async () => {
    const s = await setup();
    const fetchFn = jest.fn().mockResolvedValue(chatOk('{"kcal_per_100g":50,"protein_per_100g":40}'));
    const r = await estimateFood(s.deps(fetchFn), 'x');
    expect(r).toMatchObject({ ok: false, reason: 'rejected' });
    expect(r.ok === false && r.message).toMatch(/enter the values yourself/);
  });

  it('tries the next provider when the first gives nothing usable', async () => {
    const s = await setup(['gemini', 'groq']);
    const fetchFn = jest.fn(async (url: string) => (String(url).includes('generativelanguage') ? chatOk('no idea') : chatOk(GOOD))) as unknown as typeof fetch;
    const r = await estimateFood(s.deps(fetchFn), 'x');
    expect(r).toMatchObject({ ok: true, label: 'Groq' });
  });

  it('puts a rate-limited or rejected provider on hold just like meal reading does', async () => {
    const s = await setup(['gemini', 'groq']);
    const fetchFn = jest.fn(async (url: string) => (String(url).includes('generativelanguage') ? res(401, 'bad key') : chatOk(GOOD))) as unknown as typeof fetch;
    await estimateFood(s.deps(fetchFn), 'x');
    expect(providerStatus((await getProvider(s.db, s.rows[0].id))!, new Date(2026, 10, 25, 12))).toBe('key_rejected');
  });

  it('says so when there is no provider, when offline, and when every provider fails', async () => {
    const none = await setup([]);
    expect(await estimateFood(none.deps(jest.fn()), 'x')).toMatchObject({ ok: false, reason: 'no_providers' });
    const s = await setup();
    const offline = await estimateFood(s.deps(jest.fn(), false), 'x');
    expect(offline).toMatchObject({ ok: false, reason: 'offline' });
    expect(await estimateFood(s.deps(jest.fn().mockResolvedValue(res(503, 'down'))), 'x')).toMatchObject({ ok: false, reason: 'all_failed' });
  });

  it('makes no network request when there is nothing to ask', async () => {
    const none = await setup([]);
    const fetchFn = jest.fn();
    await estimateFood(none.deps(fetchFn), 'x');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
