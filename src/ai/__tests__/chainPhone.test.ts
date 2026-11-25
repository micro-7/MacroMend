import { DEFAULT_SLOTS } from '../../core/slots';
import { migrate } from '../../db/migrations';
import { allProvidersOutOfQuota, getProvider, listProviders, updateProvider } from '../../db/providers';
import { createTestDb } from '../../db/testDb';
import { estimateFood } from '../../lookup/estimate';
import { runChain, type ChainDeps } from '../chain';
import { explainFailure } from '../failureMessage';
import { memoryKeyStore } from '../keyStore';
import { createProvider, defaultsFor } from '../providerService';
import type { ParseResult, Parser } from '../types';
import { ITEMS_JSON, chatOk, res } from '../testing';

const ctx = { slots: DEFAULT_SLOTS };
const NOW = new Date(2026, 10, 25, 14, 30, 0);
const PHONE_ITEMS = [{ name: 'roti', qty: 2, unit: '', slot: '' }];

function phone(result: ParseResult = { ok: true, items: PHONE_ITEMS }, ready = true) {
  const parse = jest.fn(async () => result);
  const parser: Parser = { id: 'phone', label: 'Phone model', parse };
  return { phone: { parser, isReady: () => ready }, parse };
}

async function setup(kinds: ('gemini' | 'groq')[] = ['gemini', 'groq']) {
  const db = createTestDb();
  await migrate(db);
  const keys = memoryKeyStore();
  const rows = [];
  for (const k of kinds) rows.push(await createProvider(db, keys, { ...defaultsFor(k), apiKey: `key-${k}` }));
  return { db, keys, rows };
}

function deps(s: Awaited<ReturnType<typeof setup>>, fetchFn: unknown, over: Partial<ChainDeps> = {}): ChainDeps {
  return { db: s.db, keys: s.keys, isOnline: async () => true, now: () => NOW, call: { fetchFn: fetchFn as typeof fetch }, ...over };
}

const never = () => jest.fn(async () => { throw new Error('network used'); });
const okCloud = () => jest.fn(async () => chatOk(ITEMS_JSON));

describe('cloud first, then the phone model', () => {
  it('uses the cloud when it works, and never wakes the phone model', async () => {
    const s = await setup(['groq']);
    const p = phone();
    const r = await runChain(deps(s, okCloud(), { phone: p.phone }), 'x', ctx);
    expect(r).toMatchObject({ ok: true, label: 'Groq' });
    expect(p.parse).not.toHaveBeenCalled();
  });

  it('falls back to the phone model when every cloud provider fails, and lists what happened', async () => {
    const s = await setup();
    const p = phone();
    const fetchFn = jest.fn(async (url: string) => (String(url).includes('generativelanguage') ? res(503, 'down') : res(401, 'bad key')));
    const r = await runChain(deps(s, fetchFn, { phone: p.phone }), 'x', ctx);
    expect(r).toMatchObject({ ok: true, label: 'Phone model', providerId: 'phone', items: PHONE_ITEMS });
    expect(r.attempts.map((a) => a.outcome)).toEqual(['network', 'auth', 'ok']);
  });

  it('falls back to the phone model when cloud requests time out', async () => {
    const s = await setup(['groq']);
    const p = phone();
    const hang = ((_u: string, init: RequestInit) => new Promise<Response>((_r, rej) => init.signal?.addEventListener('abort', () => rej(new Error('x'))))) as unknown as typeof fetch;
    const r = await runChain({ ...deps(s, hang, { phone: p.phone }), call: { fetchFn: hang, timeoutMs: 30 } }, 'x', ctx);
    expect(r).toMatchObject({ ok: true, label: 'Phone model' });
    expect(r.attempts.map((a) => a.outcome)).toEqual(['timeout', 'ok']);
  });

  it('with no cloud key set up, uses the phone model', async () => {
    const s = await setup([]);
    const f = never();
    const r = await runChain(deps(s, f, { phone: phone().phone }), 'x', ctx);
    expect(r).toMatchObject({ ok: true, label: 'Phone model' });
    expect(f).not.toHaveBeenCalled();
  });

  it('with all cloud providers switched off, uses the phone model', async () => {
    const s = await setup(['groq']);
    await updateProvider(s.db, s.rows[0].id, { enabled: false });
    expect(await runChain(deps(s, never(), { phone: phone().phone }), 'x', ctx)).toMatchObject({ ok: true, label: 'Phone model' });
  });

  it('offline: goes straight to the phone model without trying the cloud', async () => {
    const s = await setup();
    const f = never();
    const r = await runChain(deps(s, f, { phone: phone().phone, isOnline: async () => false }), 'do roti aur ek katori dal', ctx);
    expect(r).toMatchObject({ ok: true, label: 'Phone model' });
    expect(f).not.toHaveBeenCalled();
  });

  it('without a downloaded phone model the old behaviour is unchanged (manual pick)', async () => {
    const s = await setup();
    const off = await runChain(deps(s, never(), { phone: phone(undefined, false).phone, isOnline: async () => false }), 'x', ctx);
    expect(off).toMatchObject({ ok: false, reason: 'offline' });
    const none = await setup([]);
    expect(await runChain(deps(none, never(), { phone: phone(undefined, false).phone }), 'x', ctx)).toMatchObject({ ok: false, reason: 'no_providers' });
    const failing = await runChain(deps(s, jest.fn(async () => res(503, 'down'))), 'x', ctx);
    expect(failing).toMatchObject({ ok: false, reason: 'all_failed' });
  });

  it('says all failed when the phone model also fails, naming it', async () => {
    const s = await setup(['groq']);
    const p = phone({ ok: false, error: 'invalid_reply', message: 'nope' });
    const r = await runChain(deps(s, jest.fn(async () => res(503, 'down')), { phone: p.phone }), 'x', ctx);
    expect(r).toMatchObject({ ok: false, reason: 'all_failed' });
    expect(r.attempts.map((a) => [a.label, a.outcome])).toEqual([['Groq', 'network'], ['Phone model', 'invalid_reply']]);
  });
});

describe('daily limits: phone model for the rest of the day, cloud again tomorrow', () => {
  it('after every provider reports its daily limit, uses the phone model without calling the cloud', async () => {
    const s = await setup();
    const p = phone();
    const quota = jest.fn(async () => res(429, 'Rate limit reached on tokens per day (TPD)'));
    const first = await runChain(deps(s, quota, { phone: p.phone }), 'x', ctx);
    expect(first).toMatchObject({ ok: true, label: 'Phone model' });
    expect(quota).toHaveBeenCalledTimes(2); // each provider was tried once and put on hold until midnight
    expect(allProvidersOutOfQuota(await listProviders(s.db), NOW)).toBe(true);

    const later = jest.fn(async () => chatOk(ITEMS_JSON));
    const second = await runChain(deps(s, later, { phone: p.phone }), 'y', ctx);
    expect(second).toMatchObject({ ok: true, label: 'Phone model' });
    expect(later).not.toHaveBeenCalled(); // not even tried
    expect(second.attempts.map((a) => a.outcome)).toEqual(['skipped', 'skipped', 'ok']); // both on hold, then the phone model
  });

  it('the next morning the cloud is tried again', async () => {
    const s = await setup(['groq']);
    const p = phone();
    await runChain(deps(s, jest.fn(async () => res(429, 'tokens per day (TPD)')), { phone: p.phone }), 'x', ctx);
    const cloud = okCloud();
    const tomorrow = new Date(2026, 10, 26, 8, 0, 0);
    const r = await runChain(deps(s, cloud, { phone: p.phone, now: () => tomorrow }), 'x', ctx);
    expect(r).toMatchObject({ ok: true, label: 'Groq' });
    expect(cloud).toHaveBeenCalledTimes(1);
  });

  it('one provider out of quota and the other working: the cloud is still used', async () => {
    const s = await setup();
    const f = jest.fn(async (url: string) => (String(url).includes('generativelanguage') ? res(429, 'GenerateRequestsPerDayPerProjectPerModel') : chatOk(ITEMS_JSON)));
    const r = await runChain(deps(s, f, { phone: phone().phone }), 'x', ctx);
    expect(r).toMatchObject({ ok: true, label: 'Groq' });
    expect(allProvidersOutOfQuota(await listProviders(s.db), NOW)).toBe(false);
  });

  it('a short rate limit is not a daily limit: the phone model is only a fallback, and cloud returns in a minute', async () => {
    const s = await setup(['groq']);
    await runChain(deps(s, jest.fn(async () => res(429, 'tokens per minute', { 'retry-after': '20' })), { phone: phone().phone }), 'x', ctx);
    expect(allProvidersOutOfQuota(await listProviders(s.db), NOW)).toBe(false);
    const later = new Date(NOW.getTime() + 25_000);
    const r = await runChain(deps(s, okCloud(), { phone: phone().phone, now: () => later }), 'x', ctx);
    expect(r).toMatchObject({ ok: true, label: 'Groq' });
  });

  it('reports "out of quota" only when there is something on and every one is out', async () => {
    expect(allProvidersOutOfQuota([], NOW)).toBe(false);
    const s = await setup(['groq']);
    expect(allProvidersOutOfQuota(await listProviders(s.db), NOW)).toBe(false);
    const row = await getProvider(s.db, s.rows[0].id);
    expect(allProvidersOutOfQuota([{ ...row!, enabled: false, skipUntil: '2999-01-01T00:00:00.000Z', skipReason: 'quota' }], NOW)).toBe(false);
  });
});

describe('"Always use phone model"', () => {
  it('uses only the phone model and sends nothing to the cloud, even when online with working keys', async () => {
    const s = await setup();
    const f = never();
    const p = phone();
    const r = await runChain(deps(s, f, { phone: p.phone, phoneOnly: () => true }), 'x', ctx);
    expect(r).toMatchObject({ ok: true, label: 'Phone model', providerId: 'phone' });
    expect(f).not.toHaveBeenCalled();
    expect(p.parse).toHaveBeenCalledTimes(1);
  });

  it('with the model not downloaded: manual pick, and says so, still no cloud', async () => {
    const s = await setup();
    const f = never();
    const r = await runChain(deps(s, f, { phone: phone(undefined, false).phone, phoneOnly: () => true }), 'x', ctx);
    expect(r).toMatchObject({ ok: false, reason: 'phone_unavailable' });
    expect(f).not.toHaveBeenCalled();
    expect(explainFailure(r as Extract<typeof r, { ok: false }>)).toMatch(/not downloaded/);
    expect(explainFailure(r as Extract<typeof r, { ok: false }>)).toMatch(/Settings → Phone model/);
  });

  it('with no phone support at all it behaves the same (nothing leaves the phone)', async () => {
    const s = await setup();
    const f = never();
    const r = await runChain(deps(s, f, { phoneOnly: async () => true }), 'x', ctx);
    expect(r).toMatchObject({ ok: false, reason: 'phone_unavailable' });
    expect(f).not.toHaveBeenCalled();
  });

  it('if the phone model fails it says so and still does not use the cloud', async () => {
    const s = await setup();
    const f = never();
    const p = phone({ ok: false, error: 'model', message: 'out of memory' });
    const r = await runChain(deps(s, f, { phone: p.phone, phoneOnly: () => true }), 'x', ctx);
    expect(r).toMatchObject({ ok: false, reason: 'all_failed' });
    expect(f).not.toHaveBeenCalled();
    expect(explainFailure(r as Extract<typeof r, { ok: false }>)).toContain('Phone model: could not run');
  });

  it('no AI estimate is requested either (those would go to the cloud)', async () => {
    const s = await setup();
    const f = never();
    const r = await estimateFood(deps(s, f, { phoneOnly: () => true }), 'butter chicken');
    expect(r).toMatchObject({ ok: false, reason: 'phone_only' });
    expect(r.ok === false && r.message).toMatch(/Enter the values yourself/);
    expect(f).not.toHaveBeenCalled();
  });

  it('reads the switch fresh each time', async () => {
    const s = await setup(['groq']);
    let only = true;
    const cloud = okCloud();
    const d = deps(s, cloud, { phone: phone().phone, phoneOnly: () => only });
    expect(await runChain(d, 'x', ctx)).toMatchObject({ label: 'Phone model' });
    only = false;
    expect(await runChain(d, 'x', ctx)).toMatchObject({ label: 'Groq' });
  });
});
