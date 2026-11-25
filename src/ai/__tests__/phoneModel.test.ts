import { DEFAULT_SLOTS } from '../../core/slots';
import { FEW_SHOTS } from '../prompt';
import {
  IDLE_UNLOAD_MS, PHONE_LABEL, PHONE_TIMEOUT_MS, buildPhoneSystemPrompt, createPhoneParser, type PhoneEngine, type PhoneSession,
} from '../phoneModel';

const ctx = { slots: DEFAULT_SLOTS.map((s) => ({ id: s.id, name: s.name })) };
const GOOD = '{"items":[{"name":"roti","qty":2,"unit":"","slot":""},{"name":"dal","qty":1,"unit":"","slot":""}]}';

function fakeEngine(reply: string | ((text: string) => Promise<string>) = GOOD) {
  const log = { opened: [] as string[], disposed: 0, stopped: 0, sent: [] as string[], usage: 0 };
  const engine: PhoneEngine & { failOpen: Error | null; log: typeof log } = {
    failOpen: null,
    log,
    async openSession(systemPrompt) {
      if (engine.failOpen) throw engine.failOpen;
      log.opened.push(systemPrompt);
      const s: PhoneSession = {
        send: async (t) => {
          log.sent.push(t);
          return typeof reply === 'string' ? reply : reply(t);
        },
        stop: () => void log.stopped++,
        usageRatio: () => log.usage,
        dispose: () => void log.disposed++,
      };
      return s;
    },
  };
  return engine;
}

describe('phone parser', () => {
  it('parses a reply into items and is labelled "Phone model"', async () => {
    const e = fakeEngine();
    const p = createPhoneParser(e);
    expect(p.label).toBe(PHONE_LABEL);
    expect(await p.parse('do roti aur ek katori dal', ctx)).toEqual({
      ok: true,
      items: [{ name: 'roti', qty: 2, unit: '', slot: '' }, { name: 'dal', qty: 1, unit: '', slot: '' }],
    });
    expect(e.log.sent).toEqual(['Input: do roti aur ek katori dal']);
  });

  it('gives the model the same English and Hinglish examples as the cloud providers, the meal ids, and a JSON-only reminder', async () => {
    const e = fakeEngine();
    await createPhoneParser(e).parse('x', ctx);
    const prompt = e.log.opened[0];
    for (const shot of FEW_SHOTS) expect(prompt).toContain(shot.input);
    expect(FEW_SHOTS).toHaveLength(7);
    expect(prompt).toContain('"breakfast" (Breakfast)');
    expect(prompt).toMatch(/JSON object only/);
    expect(prompt).toBe(buildPhoneSystemPrompt(ctx.slots));
  });

  it('accepts JSON inside a code fence and ignores nutrition values it adds', async () => {
    const e = fakeEngine('```json\n{"items":[{"name":"samosa","qty":2,"kcal":600}]}\n```');
    const r = await createPhoneParser(e).parse('2 samosa', ctx);
    expect(r.ok && JSON.stringify(r.items)).not.toMatch(/kcal|600/);
    expect(r.ok).toBe(true);
  });

  it('treats chatter or bad JSON as an invalid reply', async () => {
    const r = await createPhoneParser(fakeEngine('Sure! You had two rotis.')).parse('2 roti', ctx);
    expect(r).toMatchObject({ ok: false, error: 'invalid_reply' });
  });

  it('never trusts a quantity the model cannot back up: zero is rejected', async () => {
    const r = await createPhoneParser(fakeEngine('{"items":[{"name":"roti","qty":0}]}')).parse('roti', ctx);
    expect(r).toMatchObject({ ok: false, error: 'invalid_reply' });
  });
});

describe('loading and reuse', () => {
  it('loads on the first parse only, then reuses the same session', async () => {
    const e = fakeEngine();
    const p = createPhoneParser(e);
    expect(p.isLoaded()).toBe(false);
    await p.parse('a', ctx);
    await p.parse('b', ctx);
    await p.parse('c', ctx);
    expect(e.log.opened).toHaveLength(1);
    expect(p.isLoaded()).toBe(true);
  });

  it('opens a fresh session when the meal list changes', async () => {
    const e = fakeEngine();
    const p = createPhoneParser(e);
    await p.parse('a', ctx);
    await p.parse('b', { slots: [...ctx.slots, { id: 'pre', name: 'Pre-workout' }] });
    expect(e.log.opened).toHaveLength(2);
    expect(e.log.disposed).toBe(1);
    expect(e.log.opened[1]).toContain('"pre" (Pre-workout)');
  });

  it('opens a fresh session after 8 parses, so earlier meals do not pile up', async () => {
    const e = fakeEngine();
    const p = createPhoneParser(e);
    for (let i = 0; i < 9; i++) await p.parse(`m${i}`, ctx);
    expect(e.log.opened).toHaveLength(2);
    expect(e.log.disposed).toBe(1);
  });

  it('opens a fresh session when the model\'s memory is getting full', async () => {
    const e = fakeEngine();
    const p = createPhoneParser(e);
    await p.parse('a', ctx);
    e.log.usage = 0.7;
    await p.parse('b', ctx);
    expect(e.log.opened).toHaveLength(2);
  });

  it('serialises parses so two never run on the model at once', async () => {
    let running = 0;
    let maxRunning = 0;
    const e = fakeEngine(async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 10));
      running--;
      return GOOD;
    });
    const p = createPhoneParser(e);
    await Promise.all([p.parse('a', ctx), p.parse('b', ctx), p.parse('c', ctx)]);
    expect(maxRunning).toBe(1);
  });
});

describe('failures', () => {
  it('says the model could not be loaded, and tries again next time', async () => {
    const e = fakeEngine();
    e.failOpen = new Error('out of memory');
    const p = createPhoneParser(e);
    const r = await p.parse('a', ctx);
    expect(r).toMatchObject({ ok: false, error: 'model' });
    expect(r.ok === false && r.message).toMatch(/could not be loaded: out of memory/);
    expect(p.isLoaded()).toBe(false);
    e.failOpen = null;
    expect(await p.parse('a', ctx)).toMatchObject({ ok: true });
  });

  it('frees the session when the model fails mid-reply', async () => {
    const e = fakeEngine(async () => {
      throw new Error('native crash');
    });
    const p = createPhoneParser(e);
    expect(await p.parse('a', ctx)).toMatchObject({ ok: false, error: 'model' });
    expect(e.log.disposed).toBe(1);
    expect(p.isLoaded()).toBe(false);
  });

  it('gives up after the timeout (30 s by default; shortened here), stops the model and starts fresh next time', async () => {
    const e = fakeEngine(() => new Promise(() => {}));
    const p = createPhoneParser(e, { timeoutMs: 30 });
    const started = Date.now();
    expect(await p.parse('a', ctx)).toEqual({ ok: false, error: 'timeout' });
    expect(Date.now() - started).toBeLessThan(1000);
    expect(e.log.stopped).toBe(1);
    expect(e.log.disposed).toBe(1);
    expect(p.isLoaded()).toBe(false);
  });

  it('uses a 30 second timeout and a 5 minute idle time by default', () => {
    expect(PHONE_TIMEOUT_MS).toBe(30_000);
    expect(IDLE_UNLOAD_MS).toBe(300_000);
  });
});

describe('unloading', () => {
  it('unload frees the session, and it is safe to call when nothing is loaded', async () => {
    const e = fakeEngine();
    const p = createPhoneParser(e);
    p.unload();
    await p.parse('a', ctx);
    p.unload();
    p.unload();
    expect(e.log.disposed).toBe(1);
    expect(p.isLoaded()).toBe(false);
  });

  it('frees the model after 5 minutes idle, and loads it again on the next parse', async () => {
    jest.useFakeTimers();
    try {
      const e = fakeEngine();
      const p = createPhoneParser(e);
      await p.parse('a', ctx);
      jest.advanceTimersByTime(4 * 60_000);
      expect(p.isLoaded()).toBe(true);
      jest.advanceTimersByTime(61_000);
      expect(p.isLoaded()).toBe(false);
      expect(e.log.disposed).toBe(1);
      await p.parse('b', ctx);
      expect(e.log.opened).toHaveLength(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('using the model again restarts the idle clock', async () => {
    jest.useFakeTimers();
    try {
      const e = fakeEngine();
      const p = createPhoneParser(e);
      await p.parse('a', ctx);
      jest.advanceTimersByTime(4 * 60_000);
      await p.parse('b', ctx);
      jest.advanceTimersByTime(4 * 60_000);
      expect(p.isLoaded()).toBe(true);
      jest.advanceTimersByTime(2 * 60_000);
      expect(p.isLoaded()).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});
