import { extractJson, parseReply } from '../schema';
import { buildMessages, buildSystemPrompt, FEW_SHOTS } from '../prompt';
import { PRESETS, PRESET_KINDS } from '../presets';

const slots = [{ id: 'breakfast', name: 'Breakfast' }, { id: 'lunch', name: 'Lunch' }, { id: 'pre', name: 'Pre-workout' }];

describe('parseReply', () => {
  it('accepts a valid reply', () => {
    const r = parseReply('{"items":[{"name":"roti","qty":2,"unit":"","slot":""},{"name":"dal","qty":"ek","unit":"katori","slot":"lunch"}]}', slots);
    expect(r).toEqual({
      ok: true,
      items: [
        { name: 'roti', qty: 2, unit: '', slot: '' },
        { name: 'dal', qty: 'ek', unit: 'katori', slot: 'lunch' },
      ],
    });
  });

  it('ignores calories and protein a model adds', () => {
    const r = parseReply('{"items":[{"name":"samosa","qty":2,"unit":"","slot":"","kcal":520,"calories":520,"protein_g":9,"nutrition":{"kcal":1}}]}', slots);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(r.items[0]).sort()).toEqual(['name', 'qty', 'slot', 'unit']);
      expect(JSON.stringify(r.items)).not.toMatch(/kcal|calorie|protein/);
    }
  });

  it('fills in missing optional fields', () => {
    const r = parseReply('{"items":[{"name":"banana"}]}', slots);
    expect(r).toEqual({ ok: true, items: [{ name: 'banana', qty: null, unit: '', slot: '' }] });
  });

  it('finds the JSON inside a code fence or explanation text', () => {
    const fenced = 'Sure!\n```json\n{"items":[{"name":"egg","qty":2}]}\n```\nHope that helps.';
    expect(parseReply(fenced, slots).ok).toBe(true);
    expect(parseReply('<think>hmm {not json}</think> {"items":[{"name":"egg","qty":2}]}', slots).ok).toBe(true);
  });

  it('accepts a slot written as its name in any case', () => {
    const r = parseReply('{"items":[{"name":"egg","slot":"Breakfast"},{"name":"x","slot":"PRE-WORKOUT"}]}', slots);
    expect(r.ok && r.items.map((i) => i.slot)).toEqual(['breakfast', 'pre']);
  });

  it.each([
    ['plain text', 'I ate two rotis'],
    ['empty', ''],
    ['not JSON', '{items: roti}'],
    ['wrong shape', '{"foods":[{"name":"roti"}]}'],
    ['items not a list', '{"items":"roti"}'],
    ['item without a name', '{"items":[{"qty":2}]}'],
    ['empty name', '{"items":[{"name":"  "}]}'],
    ['zero quantity', '{"items":[{"name":"roti","qty":0}]}'],
    ['negative quantity', '{"items":[{"name":"roti","qty":-2}]}'],
    ['unknown meal', '{"items":[{"name":"roti","slot":"brunch"}]}'],
    ['wrong type for name', '{"items":[{"name":5}]}'],
  ])('rejects: %s', (_label, text) => {
    expect(parseReply(text, slots).ok).toBe(false);
  });

  it('rejects more than 20 items', () => {
    const many = JSON.stringify({ items: Array.from({ length: 21 }, (_, i) => ({ name: `food${i}` })) });
    expect(parseReply(many, slots).ok).toBe(false);
    const ok = JSON.stringify({ items: Array.from({ length: 20 }, (_, i) => ({ name: `food${i}` })) });
    expect(parseReply(ok, slots).ok).toBe(true);
  });
});

describe('extractJson', () => {
  it('handles braces inside strings and nested objects', () => {
    expect(extractJson('x {"a":"}{","b":{"c":1}} y')).toEqual({ a: '}{', b: { c: 1 } });
  });
  it('returns null when there is no complete object', () => {
    expect(extractJson('{"a":')).toBeNull();
    expect(extractJson('nothing here')).toBeNull();
  });
});

describe('prompt', () => {
  it('lists the user\'s slot ids and names', () => {
    const p = buildSystemPrompt(slots);
    expect(p).toContain('"breakfast" (Breakfast)');
    expect(p).toContain('"pre" (Pre-workout)');
  });

  it('has seven English/Hinglish examples and each example output is a valid reply', () => {
    expect(FEW_SHOTS).toHaveLength(7);
    for (const e of FEW_SHOTS) {
      expect(buildSystemPrompt(slots)).toContain(e.input);
      expect(parseReply(e.output, [{ id: 'breakfast', name: 'Breakfast' }, { id: 'dinner', name: 'Dinner' }]).ok).toBe(true);
    }
  });

  it('tells the model never to include nutrition, and sends the user text as the user message', () => {
    expect(buildSystemPrompt(slots)).toMatch(/Do not include calories, protein/);
    expect(buildMessages('  had 2 roti  ', slots)).toEqual([
      { role: 'system', content: buildSystemPrompt(slots) },
      { role: 'user', content: 'had 2 roti' },
    ]);
  });
});

describe('presets', () => {
  it('has Gemini, Groq, OpenRouter and custom, each with a privacy note saying what is sent', () => {
    expect(PRESET_KINDS).toEqual(['gemini', 'groq', 'openrouter', 'custom']);
    for (const k of PRESET_KINDS) expect(PRESETS[k].privacy).toMatch(/Only the text you type/);
  });

  it('warns that Gemini\'s free tier may be used by Google', () => {
    expect(PRESETS.gemini.privacy).toMatch(/Google may use/);
    expect(PRESETS.openrouter.privacy).toMatch(/may train/);
  });

  it('uses OpenAI-compatible base URLs and has default models for the three presets', () => {
    for (const k of ['gemini', 'groq', 'openrouter'] as const) {
      expect(PRESETS[k].baseUrl).toMatch(/^https:\/\//);
      expect(PRESETS[k].model).not.toBe('');
    }
    expect(PRESETS.custom.baseUrl).toBe('');
  });
});

describe('parseReply: no food found', () => {
  it('accepts an empty list as a valid answer meaning nothing was found', () => {
    expect(parseReply('{"items":[]}', [])).toEqual({ ok: true, items: [] });
  });
});
