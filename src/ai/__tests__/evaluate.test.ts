import { buildMatchIndex } from '../../core/match';
import { DEFAULT_SLOTS } from '../../core/slots';
import { ALL_FOODS } from '../../data/foods';
import { SENTENCES } from '../__fixtures__/sentences';
import { evaluate } from '../evaluate';
import { runEvalFromEnv } from '../evalRunner';
import { parseReply } from '../schema';
import { chatOk, res } from '../testing';

const index = buildMatchIndex(ALL_FOODS.map((f) => ({ id: f.id, name: f.name, aliases: f.aliases })));
const foods = new Map(ALL_FOODS.map((f) => [f.id, { unit: f.unit }]));
const recorded = new Map(SENTENCES.map((s) => [s.text, JSON.stringify({ items: s.reply })]));

const recordedParse = async (text: string) => {
  const r = parseReply(recorded.get(text) ?? '', DEFAULT_SLOTS);
  return r.ok ? { ok: true as const, items: r.items } : { ok: false as const, error: 'invalid_reply' as const };
};

describe('test sentences', () => {
  it('has 25 to 30 sentences in English, Hinglish and mixed text', () => {
    expect(SENTENCES.length).toBeGreaterThanOrEqual(25);
    expect(SENTENCES.length).toBeLessThanOrEqual(30);
    for (const lang of ['english', 'hinglish', 'mixed'] as const) expect(SENTENCES.some((s) => s.language === lang)).toBe(true);
  });

  it('only expects foods that exist in the table, with units those foods support', () => {
    for (const s of SENTENCES) for (const e of s.expected) expect(foods.has(e.food)).toBe(true);
  });

  it('has recorded replies that are valid for every sentence', () => {
    for (const s of SENTENCES) expect(parseReply(recorded.get(s.text)!, DEFAULT_SLOTS).ok).toBe(true);
  });
});

describe('evaluate (recorded replies, no network)', () => {
  it('understands every sentence end to end: AI words -> food, number words -> quantity, unit spellings -> unit', async () => {
    const r = await evaluate(SENTENCES, recordedParse, index, foods, DEFAULT_SLOTS);
    expect(r.failures.map((f) => [f.text, f.expected, f.actual])).toEqual([]);
    expect(r.correct).toBe(SENTENCES.length);
  });

  it('counts a wrong answer as a miss and shows what it got', async () => {
    const bad = async (text: string) =>
      text === 'ate a banana'
        ? { ok: true as const, items: [{ name: 'mango', qty: 1, unit: '', slot: '' }] }
        : recordedParse(text);
    const r = await evaluate(SENTENCES, bad, index, foods, DEFAULT_SLOTS);
    expect(r.correct).toBe(SENTENCES.length - 1);
    expect(r.failures[0]).toMatchObject({ text: 'ate a banana', actual: [{ food: 'usda-mango', qty: 1, unit: 'piece' }] });
  });

  it('counts a failed request as a miss with its error', async () => {
    const r = await evaluate(SENTENCES.slice(0, 2), async () => ({ ok: false, error: 'timeout' }), index, foods, DEFAULT_SLOTS);
    expect(r.correct).toBe(0);
    expect(r.failures[0].error).toBe('timeout');
  });

  it('misses a wrong quantity, wrong unit or wrong meal', async () => {
    const wrong = (patch: object) => async (text: string) => {
      const ok = await recordedParse(text);
      return text === 'had 2 roti and dal' && ok.ok ? { ok: true as const, items: ok.items.map((i, k) => (k === 0 ? { ...i, ...patch } : i)) } : ok;
    };
    for (const patch of [{ qty: 3 }, { unit: 'g' }]) {
      const r = await evaluate(SENTENCES.slice(0, 1), wrong(patch), index, foods, DEFAULT_SLOTS);
      expect(r.correct).toBe(0);
    }
    const slot = await evaluate([SENTENCES[2]], async () => ({ ok: true as const, items: SENTENCES[2].reply.map((i) => ({ ...i, slot: 'lunch' })) }), index, foods, DEFAULT_SLOTS);
    expect(slot.correct).toBe(0);
  });
});

describe('eval:parse script runner', () => {
  function fakeProvider() {
    return jest.fn(async (_url: string, init: RequestInit) => {
      const text = JSON.parse(init.body as string).messages[1].content as string;
      return chatOk(recorded.get(text) ?? '{"items":[]}');
    }) as unknown as typeof fetch;
  }

  it('runs the sentences against a provider and prints the score without revealing the key', async () => {
    const lines: string[] = [];
    const code = await runEvalFromEnv({ EVAL_PROVIDER: 'groq', EVAL_API_KEY: 'sk-topsecret-9999' }, fakeProvider(), (l) => lines.push(l));
    expect(code).toBe(0);
    const out = lines.join('\n');
    expect(out).toContain(`Score: ${SENTENCES.length} / ${SENTENCES.length} (100%)`);
    expect(out).toContain('Provider: groq (openai/gpt-oss-20b)');
    expect(out).not.toContain('topsecret');
  });

  it('lists the sentences it missed', async () => {
    const lines: string[] = [];
    const fetchFn = jest.fn(async () => chatOk('{"items":[{"name":"mango","qty":1}]}')) as unknown as typeof fetch;
    await runEvalFromEnv({ EVAL_API_KEY: 'k' }, fetchFn, (l) => lines.push(l));
    const out = lines.join('\n');
    expect(out).toMatch(/MISSED: had 2 roti and dal/);
    expect(out).toMatch(/Score: \d+ \/ 30/);
  });

  it('reports a rejected key per sentence', async () => {
    const lines: string[] = [];
    const fetchFn = jest.fn(async () => res(401, 'bad key')) as unknown as typeof fetch;
    await runEvalFromEnv({ EVAL_API_KEY: 'k' }, fetchFn, (l) => lines.push(l));
    expect(lines.join('\n')).toMatch(/error: auth/);
  });

  it('explains what is missing instead of running', async () => {
    const lines: string[] = [];
    expect(await runEvalFromEnv({}, undefined, (l) => lines.push(l))).toBe(1);
    expect(lines.join('\n')).toMatch(/EVAL_API_KEY/);
    expect(await runEvalFromEnv({ EVAL_API_KEY: 'k', EVAL_PROVIDER: 'nope' }, undefined, () => {})).toBe(1);
    expect(await runEvalFromEnv({ EVAL_API_KEY: 'k', EVAL_PROVIDER: 'custom' }, undefined, () => {})).toBe(1);
  });
});

describe('evaluate progress and stopping', () => {
  it('reports progress after each sentence', async () => {
    const seen: string[] = [];
    await evaluate(SENTENCES.slice(0, 3), recordedParse, index, foods, DEFAULT_SLOTS, { onProgress: (d, t) => seen.push(`${d}/${t}`) });
    expect(seen).toEqual(['1/3', '2/3', '3/3']);
  });

  it('can be stopped, scoring only what ran', async () => {
    const stop = new AbortController();
    const r = await evaluate(SENTENCES.slice(0, 5), recordedParse, index, foods, DEFAULT_SLOTS, {
      signal: stop.signal,
      onProgress: (d) => {
        if (d === 2) stop.abort();
      },
    });
    expect(r.total).toBe(2);
    expect(r.correct).toBe(2);
  });
});
