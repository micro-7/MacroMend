import { migrate } from '../../db/migrations';
import { getProvider, isSkipped, listProviders, providerStatus } from '../../db/providers';
import { createTestDb } from '../../db/testDb';
import { memoryKeyStore } from '../keyStore';
import {
  createProvider, defaultsFor, errorMessage, removeProvider, saveProvider, testProvider, validateProviderForm,
  type ProviderFormValues,
} from '../providerService';
import { ITEMS_JSON, chatOk, res } from '../testing';

async function setup() {
  const db = createTestDb();
  await migrate(db);
  return { db, keys: memoryKeyStore() };
}

const groq = (over: Partial<ProviderFormValues> = {}): ProviderFormValues => ({ ...defaultsFor('groq'), apiKey: 'gsk_abcdef123456', ...over });

describe('validateProviderForm', () => {
  it('needs a name, an https address, a model and (when adding) a key', () => {
    expect(validateProviderForm(groq(), false)).toEqual({});
    expect(validateProviderForm(groq({ label: ' ' }), false).label).toBeDefined();
    expect(validateProviderForm(groq({ baseUrl: 'http://x.com' }), false).baseUrl).toBeDefined();
    expect(validateProviderForm(groq({ baseUrl: 'api.groq.com' }), false).baseUrl).toBeDefined();
    expect(validateProviderForm(groq({ model: '' }), false).model).toBeDefined();
    expect(validateProviderForm(groq({ apiKey: '' }), false).apiKey).toBeDefined();
  });

  it('lets the key stay empty while editing (keeps the saved key)', () => {
    expect(validateProviderForm(groq({ apiKey: '' }), true)).toEqual({});
  });

  it('starts presets with their address and model, and a custom provider blank', () => {
    expect(defaultsFor('groq')).toMatchObject({ baseUrl: 'https://api.groq.com/openai/v1', model: 'openai/gpt-oss-20b', label: 'Groq' });
    expect(defaultsFor('custom')).toMatchObject({ baseUrl: '', model: '' });
    expect(validateProviderForm(defaultsFor('custom'), false)).toMatchObject({ baseUrl: expect.any(String), model: expect.any(String) });
  });
});

describe('create, save and remove', () => {
  it('adds a provider and keeps the key in the key store, not the database', async () => {
    const { db, keys } = await setup();
    const row = await createProvider(db, keys, groq());
    expect(await keys.get(row.id)).toBe('gsk_abcdef123456');
    expect(JSON.stringify(await db.getAll('SELECT * FROM providers'))).not.toContain('gsk_abcdef');
  });

  it('adds a custom provider', async () => {
    const { db, keys } = await setup();
    const row = await createProvider(db, keys, { kind: 'custom', label: 'Cloudflare', baseUrl: 'https://api.cloudflare.com/client/v4/accounts/abc/ai/v1', model: '@cf/meta/llama', apiKey: 'cf-key' });
    expect(row).toMatchObject({ kind: 'custom', label: 'Cloudflare', model: '@cf/meta/llama' });
  });

  it('edits the model and keeps the old key when the key box is left empty', async () => {
    const { db, keys } = await setup();
    const row = await createProvider(db, keys, groq());
    await saveProvider(db, keys, row.id, groq({ model: 'openai/gpt-oss-120b', apiKey: '' }));
    expect((await getProvider(db, row.id))?.model).toBe('openai/gpt-oss-120b');
    expect(await keys.get(row.id)).toBe('gsk_abcdef123456');
  });

  it('replaces the key and clears a "key rejected" hold', async () => {
    const { db, keys } = await setup();
    const row = await createProvider(db, keys, groq());
    await testProvider({ ...groq(), apiKey: 'bad' }, { db, providerId: row.id, fetchFn: jest.fn().mockResolvedValue(res(401, 'no')) as unknown as typeof fetch });
    expect(providerStatus((await getProvider(db, row.id))!)).toBe('key_rejected');
    await saveProvider(db, keys, row.id, groq({ apiKey: 'gsk_newkey9999' }));
    expect(await keys.get(row.id)).toBe('gsk_newkey9999');
    expect(isSkipped((await getProvider(db, row.id))!)).toBe(false);
  });

  it('deleting a provider removes its key too', async () => {
    const { db, keys } = await setup();
    const row = await createProvider(db, keys, groq());
    await removeProvider(db, keys, row.id);
    expect(await keys.get(row.id)).toBeNull();
    expect(await listProviders(db)).toEqual([]);
    expect(keys.dump()).toEqual({});
  });
});

describe('testProvider', () => {
  const values = { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'm', apiKey: 'k' };
  const withFetch = (r: Response | Error) => ({
    fetchFn: (r instanceof Error ? jest.fn().mockRejectedValue(r) : jest.fn().mockResolvedValue(r)) as unknown as typeof fetch,
  });

  it('says OK when the model answers with usable items', async () => {
    expect(await testProvider(values, withFetch(chatOk(ITEMS_JSON)))).toEqual({ ok: true });
  });

  it.each([
    ['invalid key', res(401, 'bad'), 'auth', /key was rejected/],
    ['rate limited', res(429, 'too fast', { 'retry-after': '20' }), 'rate_limit', /Rate limited/],
    ['model not found', res(404, 'nope'), 'model', /model name/],
    ['server down', res(503, 'down'), 'network', /Couldn't reach/],
    ['unusable reply', chatOk('hello'), 'invalid_reply', /expected format/],
  ])('explains: %s', async (_name, response, code, pattern) => {
    const r = await testProvider(values, withFetch(response));
    expect(r).toMatchObject({ ok: false, error: code });
    expect((r as { message: string }).message).toMatch(pattern);
  });

  it('explains a network failure and a timeout', async () => {
    expect(await testProvider(values, withFetch(new TypeError('Network request failed')))).toMatchObject({ ok: false, error: 'network' });
    const hang = ((_u: string, init: RequestInit) => new Promise<Response>((_res, rej) => init.signal?.addEventListener('abort', () => rej(new Error('x'))))) as unknown as typeof fetch;
    expect(await testProvider(values, { fetchFn: hang, timeoutMs: 20 })).toMatchObject({ ok: false, error: 'timeout' });
  });

  it('remembers results for a saved provider: rejected key and quota put it on hold, success clears it', async () => {
    const { db, keys } = await setup();
    const row = await createProvider(db, keys, groq());
    const now = new Date(2026, 10, 25, 10, 0, 0);
    await testProvider(values, { db, providerId: row.id, now, ...withFetch(res(429, 'tokens per day (TPD) exceeded')) });
    expect(providerStatus((await getProvider(db, row.id))!, now)).toBe('out_of_quota');
    await testProvider(values, { db, providerId: row.id, now, ...withFetch(chatOk(ITEMS_JSON)) });
    expect(providerStatus((await getProvider(db, row.id))!, now)).toBe('ok');
  });

  it('has a plain message for every error code', () => {
    for (const c of ['rate_limit', 'quota', 'auth', 'model', 'invalid_reply', 'network', 'timeout'] as const) expect(errorMessage(c).length).toBeGreaterThan(10);
  });
});
