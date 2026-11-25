import { callChat, createCloudParser, mapHttpError, type CloudProvider } from '../openaiCompat';
import { buildMessages } from '../prompt';
import { ITEMS_JSON, chatOk, res } from '../testing';

const provider: CloudProvider = {
  id: 'groq-1', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1/', model: 'openai/gpt-oss-20b', apiKey: 'sk-secret-1234',
};
const slots = [{ id: 'breakfast', name: 'Breakfast' }, { id: 'lunch', name: 'Lunch' }];
const messages = buildMessages('2 samosa', slots);

describe('callChat', () => {
  it('posts an OpenAI-format request with the key, model and JSON mode', async () => {
    const fetchFn = jest.fn().mockResolvedValue(chatOk(ITEMS_JSON));
    const r = await callChat(provider, messages, { fetchFn });
    expect(r).toEqual({ ok: true, text: ITEMS_JSON });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer sk-secret-1234');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: 'openai/gpt-oss-20b', temperature: 0, response_format: { type: 'json_object' } });
    expect(body.messages).toEqual(messages);
  });

  it('sends the key only in the Authorization header, never in the URL or body', async () => {
    const fetchFn = jest.fn().mockResolvedValue(chatOk(ITEMS_JSON));
    await callChat(provider, messages, { fetchFn });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).not.toContain('sk-secret');
    expect(init.body).not.toContain('sk-secret');
  });

  it('asks again without JSON mode when the service rejects that field', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(res(400, { error: { message: "'response_format' is not supported for this model" } }))
      .mockResolvedValueOnce(chatOk(ITEMS_JSON));
    expect(await callChat(provider, messages, { fetchFn })).toEqual({ ok: true, text: ITEMS_JSON });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchFn.mock.calls[1][1].body)).not.toHaveProperty('response_format');
  });

  it('reads reply text given as a list of parts', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(200, { choices: [{ message: { content: [{ type: 'text', text: ITEMS_JSON }] } }] }));
    expect(await callChat(provider, messages, { fetchFn })).toEqual({ ok: true, text: ITEMS_JSON });
  });

  it('reports a network failure', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    expect(await callChat(provider, messages, { fetchFn })).toMatchObject({ ok: false, error: 'network' });
  });

  it('gives up after the timeout (8 s by default; shortened here)', async () => {
    const fetchFn = jest.fn((_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      }),
    );
    const started = Date.now();
    const r = await callChat(provider, messages, { fetchFn: fetchFn as unknown as typeof fetch, timeoutMs: 30 });
    expect(r).toEqual({ ok: false, error: 'timeout' });
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('reports an invalid reply when the body is not JSON or has no text', async () => {
    expect(await callChat(provider, messages, { fetchFn: jest.fn().mockResolvedValue(res(200, 'oops <html>')) })).toMatchObject({ ok: false, error: 'invalid_reply' });
    expect(await callChat(provider, messages, { fetchFn: jest.fn().mockResolvedValue(res(200, { choices: [] })) })).toMatchObject({ ok: false, error: 'invalid_reply' });
  });
});

describe('mapHttpError', () => {
  it('maps rate limits and uses Retry-After (default 60 s)', () => {
    expect(mapHttpError(429, 'Rate limit reached on tokens per minute (TPM)', '12')).toMatchObject({ error: 'rate_limit', retryAfterS: 12 });
    expect(mapHttpError(429, 'slow down')).toMatchObject({ error: 'rate_limit', retryAfterS: 60 });
  });

  it('maps daily limits to quota (Groq, Gemini and OpenRouter wording)', () => {
    expect(mapHttpError(429, 'Rate limit reached for model on tokens per day (TPD): Limit 200000')).toMatchObject({ error: 'quota' });
    expect(mapHttpError(429, 'Quota exceeded for metric GenerateRequestsPerDayPerProjectPerModel-FreeTier')).toMatchObject({ error: 'quota' });
    expect(mapHttpError(429, 'Rate limit exceeded: free-models-per-day')).toMatchObject({ error: 'quota' });
    expect(mapHttpError(429, 'You have hit your daily limit')).toMatchObject({ error: 'quota' });
  });

  it('maps a per-minute Gemini limit to rate_limit, not quota', () => {
    expect(mapHttpError(429, 'Quota exceeded for metric GenerateRequestsPerMinutePerProjectPerModel')).toMatchObject({ error: 'rate_limit' });
  });

  it('maps rejected keys, missing models, timeouts and server errors', () => {
    expect(mapHttpError(401, 'Invalid API key')).toMatchObject({ error: 'auth' });
    expect(mapHttpError(403, 'forbidden')).toMatchObject({ error: 'auth' });
    expect(mapHttpError(404, 'not found')).toMatchObject({ error: 'model' });
    expect(mapHttpError(400, 'The model `foo` does not exist')).toMatchObject({ error: 'model' });
    expect(mapHttpError(400, 'model_decommissioned')).toMatchObject({ error: 'model' });
    expect(mapHttpError(408, '')).toMatchObject({ error: 'timeout' });
    expect(mapHttpError(500, 'boom')).toMatchObject({ error: 'network' });
    expect(mapHttpError(503, 'overloaded')).toMatchObject({ error: 'network' });
  });

  it('reads a Retry-After date', () => {
    const r = mapHttpError(429, 'limit', new Date(Date.now() + 30_000).toUTCString());
    expect(r.retryAfterS).toBeGreaterThanOrEqual(28);
    expect(r.retryAfterS).toBeLessThanOrEqual(31);
  });
});

describe('createCloudParser', () => {
  const ctx = { slots };

  it('returns validated items', async () => {
    const p = createCloudParser(provider, { fetchFn: jest.fn().mockResolvedValue(chatOk(ITEMS_JSON)) });
    expect(await p.parse('2 samosa', ctx)).toEqual({ ok: true, items: [{ name: 'samosa', qty: 2, unit: '', slot: '' }] });
  });

  it('ignores nutrition values in the reply', async () => {
    const reply = '{"items":[{"name":"samosa","qty":2,"unit":"","slot":"","kcal":520,"protein":9}]}';
    const p = createCloudParser(provider, { fetchFn: jest.fn().mockResolvedValue(chatOk(reply)) });
    const r = await p.parse('2 samosa', ctx);
    expect(r.ok && JSON.stringify(r.items)).not.toMatch(/kcal|protein|520/);
  });

  it('treats an unusable reply as invalid_reply', async () => {
    const p = createCloudParser(provider, { fetchFn: jest.fn().mockResolvedValue(chatOk('Sorry, I cannot help with that.')) });
    expect(await p.parse('2 samosa', ctx)).toMatchObject({ ok: false, error: 'invalid_reply' });
  });

  it('passes errors through unchanged', async () => {
    const p = createCloudParser(provider, { fetchFn: jest.fn().mockResolvedValue(res(401, 'bad key')) });
    expect(await p.parse('2 samosa', ctx)).toMatchObject({ ok: false, error: 'auth' });
  });
});
