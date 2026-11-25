import { DEFAULT_SLOTS } from '../../core/slots';
import { migrate } from '../../db/migrations';
import { addProvider, getProvider, listProviders, providerStatus, updateProvider } from '../../db/providers';
import { createTestDb } from '../../db/testDb';
import { runChain, type ChainDeps } from '../chain';
import { memoryKeyStore } from '../keyStore';
import { ITEMS_JSON, chatOk, res } from '../testing';

const ctx = { slots: DEFAULT_SLOTS };
const NOW = new Date(2026, 10, 25, 14, 30, 0); // 25 Nov 2026, 14:30 local

async function setup(order: ('gemini' | 'groq' | 'openrouter')[] = ['gemini', 'groq']) {
  const db = createTestDb();
  await migrate(db);
  const keys = memoryKeyStore();
  const rows = [];
  for (const kind of order) {
    const r = await addProvider(db, { kind, label: kind, baseUrl: `https://${kind}.example/v1`, model: 'm' });
    await keys.set(r.id, `key-${kind}`);
    rows.push(r);
  }
  return { db, keys, rows };
}

/** fetch that answers per host, and records the hosts it was asked. */
function fetchBy(answers: Record<string, () => Response | Promise<Response>>) {
  const calls: string[] = [];
  const fn = jest.fn(async (url: string) => {
    const host = new URL(url).host.split('.')[0];
    calls.push(host);
    const a = answers[host];
    if (!a) throw new Error(`unexpected host ${host}`);
    return a();
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

const deps = (s: Awaited<ReturnType<typeof setup>>, fetchFn: typeof fetch, online = true, timeoutMs = 8000): ChainDeps => ({
  db: s.db, keys: s.keys, isOnline: async () => online, now: () => NOW, call: { fetchFn, timeoutMs },
});

describe('runChain', () => {
  it('uses the first provider when it works', async () => {
    const s = await setup();
    const f = fetchBy({ gemini: () => chatOk(ITEMS_JSON), groq: () => chatOk('unused') });
    const r = await runChain(deps(s, f.fn), '2 samosa', ctx);
    expect(r).toMatchObject({ ok: true, label: 'gemini', items: [{ name: 'samosa', qty: 2 }] });
    expect(f.calls).toEqual(['gemini']);
  });

  it('moves to the next provider when the first is rate limited, and holds the first for the Retry-After time', async () => {
    const s = await setup();
    const f = fetchBy({ gemini: () => res(429, 'Too many requests per minute', { 'retry-after': '30' }), groq: () => chatOk(ITEMS_JSON) });
    const r = await runChain(deps(s, f.fn), '2 samosa', ctx);
    expect(r).toMatchObject({ ok: true, label: 'groq' });
    expect(f.calls).toEqual(['gemini', 'groq']);
    const gem = (await getProvider(s.db, s.rows[0].id))!;
    expect(providerStatus(gem, NOW)).toBe('rate_limited');
    expect(new Date(gem.skipUntil!).getTime()).toBe(NOW.getTime() + 30_000);
    // 31 seconds later it is tried again
    const later = new Date(NOW.getTime() + 31_000);
    expect(providerStatus(gem, later)).toBe('ok');
  });

  it('skips a provider that hit its daily quota until local midnight, without calling it again', async () => {
    const s = await setup();
    const f1 = fetchBy({ gemini: () => res(429, 'Quota exceeded: GenerateRequestsPerDayPerProjectPerModel-FreeTier'), groq: () => chatOk(ITEMS_JSON) });
    await runChain(deps(s, f1.fn), '2 samosa', ctx);
    const gem = (await getProvider(s.db, s.rows[0].id))!;
    expect(providerStatus(gem, NOW)).toBe('out_of_quota');
    expect(new Date(gem.skipUntil!).getTime()).toBe(new Date(2026, 10, 26, 0, 0, 0).getTime());

    const f2 = fetchBy({ gemini: () => chatOk('should not be called'), groq: () => chatOk(ITEMS_JSON) });
    const r = await runChain(deps(s, f2.fn), 'dal', ctx);
    expect(f2.calls).toEqual(['groq']);
    expect(r.attempts[0]).toMatchObject({ label: 'gemini', outcome: 'skipped' });

    // the next morning it is back
    const f3 = fetchBy({ gemini: () => chatOk(ITEMS_JSON), groq: () => chatOk('unused') });
    const tomorrow = { ...deps(s, f3.fn), now: () => new Date(2026, 10, 26, 8, 0, 0) };
    const r2 = await runChain(tomorrow, 'dal', ctx);
    expect(f3.calls).toEqual(['gemini']);
    expect(r2).toMatchObject({ ok: true, label: 'gemini' });
  });

  it('marks a rejected key and does not retry it until the user edits the provider', async () => {
    const s = await setup();
    const f = fetchBy({ gemini: () => res(401, 'API key not valid'), groq: () => chatOk(ITEMS_JSON) });
    const r = await runChain(deps(s, f.fn), '2 samosa', ctx);
    expect(r).toMatchObject({ ok: true, label: 'groq' });
    const gem = (await getProvider(s.db, s.rows[0].id))!;
    expect(providerStatus(gem, NOW)).toBe('key_rejected');
    await runChain(deps(s, f.fn), 'again', ctx);
    expect(f.calls.filter((c) => c === 'gemini')).toHaveLength(1);
    await updateProvider(s.db, gem.id, { model: 'fixed-model' });
    await runChain(deps(s, f.fn), 'again', ctx);
    expect(f.calls.filter((c) => c === 'gemini')).toHaveLength(2);
  });

  it('abandons a provider that does not reply in time and tries the next', async () => {
    const s = await setup();
    const hang = () => new Promise<Response>(() => {});
    const f = fetchBy({ gemini: hang, groq: () => chatOk(ITEMS_JSON) });
    // the mocked fetch ignores the abort signal, so wrap it to reject on abort like real fetch
    const abortable = ((url: string, init: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        (f.fn as unknown as (u: string) => Promise<Response>)(url).then(resolve, reject);
      })) as unknown as typeof fetch;
    const r = await runChain(deps(s, abortable, true, 40), '2 samosa', ctx);
    expect(r).toMatchObject({ ok: true, label: 'groq' });
    expect(r.attempts.map((a) => a.outcome)).toEqual(['timeout', 'ok']);
  });

  it('treats invalid JSON as a failed attempt and tries the next provider', async () => {
    const s = await setup();
    const f = fetchBy({ gemini: () => chatOk('I think you ate two samosas!'), groq: () => chatOk(ITEMS_JSON) });
    const r = await runChain(deps(s, f.fn), '2 samosa', ctx);
    expect(r).toMatchObject({ ok: true, label: 'groq' });
    expect(r.attempts[0].outcome).toBe('invalid_reply');
    // an unusable reply is not a reason to put the provider on hold
    expect(providerStatus((await getProvider(s.db, s.rows[0].id))!, NOW)).toBe('ok');
  });

  it('does not call any provider when offline', async () => {
    const s = await setup();
    const f = fetchBy({ gemini: () => chatOk(ITEMS_JSON) });
    const r = await runChain(deps(s, f.fn, false), '2 samosa', ctx);
    expect(r).toMatchObject({ ok: false, reason: 'offline' });
    expect(f.calls).toEqual([]);
  });

  it('says so when no provider is set up or all are switched off', async () => {
    const s = await setup([]);
    expect(await runChain(deps(s, fetchBy({}).fn), 'x', ctx)).toMatchObject({ ok: false, reason: 'no_providers' });
    const s2 = await setup(['groq']);
    await updateProvider(s2.db, s2.rows[0].id, { enabled: false });
    expect(await runChain(deps(s2, fetchBy({}).fn), 'x', ctx)).toMatchObject({ ok: false, reason: 'no_providers' });
  });

  it('reports every failure when all providers fail', async () => {
    const s = await setup();
    const f = fetchBy({ gemini: () => res(503, 'overloaded'), groq: () => res(404, 'model not found') });
    const r = await runChain(deps(s, f.fn), 'x', ctx);
    expect(r).toMatchObject({ ok: false, reason: 'all_failed' });
    expect(r.attempts.map((a) => a.outcome)).toEqual(['network', 'model']);
    const rows = await listProviders(s.db);
    expect(rows.map((p) => p.lastError)).toEqual([expect.stringContaining('network'), expect.stringContaining('model')]);
  });

  it('skips a provider with no saved key', async () => {
    const s = await setup();
    await s.keys.delete(s.rows[0].id);
    const f = fetchBy({ groq: () => chatOk(ITEMS_JSON) });
    const r = await runChain(deps(s, f.fn), 'x', ctx);
    expect(r).toMatchObject({ ok: true, label: 'groq' });
    expect(r.attempts[0].outcome).toBe('no_key');
  });

  it('follows the order the user set', async () => {
    const s = await setup(['groq', 'gemini', 'openrouter']);
    const f = fetchBy({ groq: () => res(429, 'slow'), gemini: () => chatOk(ITEMS_JSON), openrouter: () => chatOk('x') });
    const r = await runChain(deps(s, f.fn), 'x', ctx);
    expect(r).toMatchObject({ ok: true, label: 'gemini' });
    expect(f.calls).toEqual(['groq', 'gemini']);
  });
});
