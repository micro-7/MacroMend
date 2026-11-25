import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { memoryKeyStore } from '../../../ai/keyStore';
import { ITEMS_JSON, chatOk, res } from '../../../ai/testing';
import { DbProvider } from '../../../db/DbContext';
import { migrate } from '../../../db/migrations';
import { addProvider, getProvider, listProviders } from '../../../db/providers';
import { createTestDb } from '../../../db/testDb';
import { ProviderEditor } from '../ProviderEditor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: ReactTestRenderer[] = [];
afterEach(async () => {
  await act(async () => mounted.splice(0).forEach((r) => r.unmount()));
});

const texts = (r: ReactTestRenderer) =>
  r.root.findAll((n) => (n.type as unknown as string) === 'Text')
    .map((n) => [n.props.children].flat(5).filter((c: unknown) => typeof c === 'string' || typeof c === 'number').join(''))
    .join(' | ');
/** The API key box is the only secure text field in the editor. */
const input = (r: ReactTestRenderer, _label: 'key'): ReactTestInstance =>
  r.root.findAll((n) => (n.type as unknown as string) === 'TextInput' && n.props.secureTextEntry === true)[0];
const button = (r: ReactTestRenderer, label: string) =>
  r.root.findAll((n) => n.props.accessibilityRole === 'button' && texts({ root: n } as unknown as ReactTestRenderer) === label)[0];

async function setup(opts: { provider?: Awaited<ReturnType<typeof addProvider>>; savedKey?: string | null; fetchFn?: typeof fetch } = {}) {
  const db = createTestDb();
  await migrate(db);
  const keys = memoryKeyStore();
  const provider = opts.provider ? await addProvider(db, { kind: opts.provider.kind, label: opts.provider.label, baseUrl: opts.provider.baseUrl, model: opts.provider.model }) : undefined;
  if (provider && opts.savedKey) await keys.set(provider.id, opts.savedKey);
  const done: string[] = [];
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(
      <DbProvider value={db}>
        <ProviderEditor provider={provider} savedKey={opts.savedKey ?? null} keys={keys} onDone={(x) => done.push(x)} callOptions={opts.fetchFn ? { fetchFn: opts.fetchFn } : undefined} />
      </DbProvider>,
    );
  });
  mounted.push(r);
  return { db, keys, r, done, provider };
}

const groqRow = { id: '', kind: 'groq' as const, label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'openai/gpt-oss-20b', position: 0, enabled: true, skipUntil: null, skipReason: null, lastError: null };

describe('ProviderEditor: adding', () => {
  it('shows the services, a "get a free key" link and the privacy note', async () => {
    const { r } = await setup();
    const t = texts(r);
    for (const name of ['Google Gemini', 'Groq', 'OpenRouter', 'Custom (OpenAI-compatible)']) expect(t).toContain(name);
    expect(t).toContain('Get a free key');
    expect(t).toMatch(/Only the text you type/);
  });

  it('shows the Gemini privacy warning when Gemini is chosen', async () => {
    const { r } = await setup();
    const gemini = r.root.findAll((n) => n.props.accessibilityRole === 'radio' && texts({ root: n } as unknown as ReactTestRenderer) === 'Google Gemini')[0];
    await act(async () => gemini.props.onPress());
    expect(texts(r)).toMatch(/Google may use what you send/);
  });

  it('refuses to add without a key and says so', async () => {
    const { r, db, done } = await setup();
    await act(async () => button(r, 'Add provider').props.onPress());
    expect(texts(r)).toContain('Paste your API key.');
    expect(await listProviders(db)).toEqual([]);
    expect(done).toEqual([]);
  });

  it('adds a Groq provider, keeping the key in secure storage', async () => {
    const { r, db, keys, done } = await setup();
    await act(async () => input(r, 'key').props.onChangeText('gsk_abcdef123456'));
    await act(async () => button(r, 'Add provider').props.onPress());
    const rows = await listProviders(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'groq', model: 'openai/gpt-oss-20b' });
    expect(await keys.get(rows[0].id)).toBe('gsk_abcdef123456');
    expect(done).toEqual(['saved']);
  });

  it('tests a key and says OK, or says why not', async () => {
    const ok = await setup({ fetchFn: jest.fn().mockResolvedValue(chatOk(ITEMS_JSON)) as unknown as typeof fetch });
    await act(async () => input(ok.r, 'key').props.onChangeText('good'));
    await act(async () => button(ok.r, 'Test').props.onPress());
    expect(texts(ok.r)).toMatch(/OK: the key works/);

    const bad = await setup({ fetchFn: jest.fn().mockResolvedValue(res(401, 'no')) as unknown as typeof fetch });
    await act(async () => input(bad.r, 'key').props.onChangeText('wrong'));
    await act(async () => button(bad.r, 'Test').props.onPress());
    expect(texts(bad.r)).toMatch(/key was rejected/);
  });

  it('asks for the key before testing', async () => {
    const { r } = await setup();
    await act(async () => button(r, 'Test').props.onPress());
    expect(texts(r)).toContain('Paste your API key.');
  });
});

describe('ProviderEditor: editing', () => {
  it('shows the saved key masked except the last 4 characters and keeps it when left empty', async () => {
    const { r, db, keys, provider, done } = await setup({ provider: groqRow as never, savedKey: 'gsk_abcdef123456' });
    const keyInput = input(r, 'key');
    expect(keyInput.props.placeholder).toBe('••••••••••••3456');
    expect(keyInput.props.placeholder).not.toContain('gsk_');
    await act(async () => button(r, 'Save').props.onPress());
    expect(await keys.get(provider!.id)).toBe('gsk_abcdef123456');
    expect(done).toEqual(['saved']);
    expect((await getProvider(db, provider!.id))?.model).toBe('openai/gpt-oss-20b');
  });

  it('deleting removes the provider and its key', async () => {
    const { r, db, keys, provider, done } = await setup({ provider: groqRow as never, savedKey: 'gsk_abcdef123456' });
    await act(async () => button(r, 'Delete provider').props.onPress());
    expect(await listProviders(db)).toEqual([]);
    expect(await keys.get(provider!.id)).toBeNull();
    expect(done).toEqual(['deleted']);
  });

  it('can switch a provider off', async () => {
    const { r, db, provider } = await setup({ provider: groqRow as never, savedKey: 'k' });
    const sw = r.root.findAll((n) => typeof n.props.onValueChange === 'function')[0];
    await act(async () => sw.props.onValueChange(false));
    await act(async () => button(r, 'Save').props.onPress());
    expect((await getProvider(db, provider!.id))?.enabled).toBe(false);
  });
});
