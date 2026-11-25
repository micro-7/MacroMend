import { buildSystemPrompt } from './prompt';
import { parseReply } from './schema';
import type { ParseContext, ParseResult, ParseSlot, Parser } from './types';

/** One conversation with the phone model, with the instructions already loaded. */
export interface PhoneSession {
  /** Send one user line and get the model's full reply text. */
  send(userText: string): Promise<string>;
  /** Interrupt a reply that is still being written. */
  stop(): void;
  /** How full the model's memory of the conversation is, 0 to 1. */
  usageRatio(): number;
  /** Free the model's memory. */
  dispose(): void;
}

/** Loads the model. The real one uses react-native-executorch; tests use a fake. */
export interface PhoneEngine {
  openSession(systemPrompt: string): Promise<PhoneSession>;
}

export const PHONE_TIMEOUT_MS = 30_000;
/** Start a fresh session after this many parses, so old meals do not pile up in the model's context. */
export const MAX_TURNS_PER_SESSION = 8;
/** ...or when the model's context is this full. */
export const MAX_CONTEXT_USAGE = 0.6;
/** Free the model's memory after this long without use. */
export const IDLE_UNLOAD_MS = 5 * 60_000;

export interface PhoneParserOptions {
  timeoutMs?: number;
  idleMs?: number;
  maxTurns?: number;
  maxUsage?: number;
  /** Test hook for timers. */
  timers?: { set: (fn: () => void, ms: number) => unknown; clear: (handle: unknown) => void };
}

export interface PhoneParser extends Parser {
  /** Free the model's memory now (app in the background, model deleted, ...). */
  unload(): void;
  isLoaded(): boolean;
}

export const PHONE_LABEL = 'Phone model';

/** The shared instructions and examples, plus a stricter reminder because small models like to chat. */
export function buildPhoneSystemPrompt(slots: ParseSlot[]): string {
  return `${buildSystemPrompt(slots)}\nReply with the JSON object only: no explanation, no markdown, nothing before or after it.`;
}

const slotKey = (slots: ParseSlot[]) => slots.map((s) => `${s.id}:${s.name}`).join('|');

/**
 * A parser backed by the on-device model. It keeps one loaded session between parses, reopens it when the meal
 * list changes, after a few parses or when the model's context is getting full, and frees it after a while idle.
 * Parses run one at a time.
 */
export function createPhoneParser(engine: PhoneEngine, options: PhoneParserOptions = {}): PhoneParser {
  const timeoutMs = options.timeoutMs ?? PHONE_TIMEOUT_MS;
  const idleMs = options.idleMs ?? IDLE_UNLOAD_MS;
  const maxTurns = options.maxTurns ?? MAX_TURNS_PER_SESSION;
  const maxUsage = options.maxUsage ?? MAX_CONTEXT_USAGE;
  const timers = options.timers ?? {
    set: (fn, ms) => {
      const handle = setTimeout(fn, ms);
      // In Node (tests) a pending timer would keep the process alive; in the app this does nothing.
      (handle as { unref?: () => void } | undefined)?.unref?.();
      return handle;
    },
    clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  };

  let session: PhoneSession | null = null;
  let sessionSlots = '';
  let turns = 0;
  let idle: unknown = null;
  let queue: Promise<unknown> = Promise.resolve();

  const cancelIdle = () => {
    if (idle !== null) timers.clear(idle);
    idle = null;
  };

  const unload = () => {
    cancelIdle();
    const s = session;
    session = null;
    turns = 0;
    sessionSlots = '';
    try {
      s?.dispose();
    } catch {
      // Already gone; nothing more to free.
    }
  };

  const run = async (text: string, ctx: ParseContext): Promise<ParseResult> => {
    cancelIdle();
    const key = slotKey(ctx.slots);
    try {
      if (!session || sessionSlots !== key || turns >= maxTurns || session.usageRatio() >= maxUsage) {
        unload();
        session = await engine.openSession(buildPhoneSystemPrompt(ctx.slots));
        sessionSlots = key;
      }
    } catch (e) {
      unload();
      return { ok: false, error: 'model', message: `The phone model could not be loaded: ${e instanceof Error ? e.message : String(e)}` };
    }

    const current = session!;
    turns++;
    let timer: unknown = null;
    try {
      const reply = await Promise.race([
        current.send(`Input: ${text.trim()}`),
        new Promise<never>((_, reject) => {
          timer = timers.set(() => {
            try {
              current.stop();
            } catch {
              // The reply may already have finished.
            }
            reject(new Error('timeout'));
          }, timeoutMs);
        }),
      ]);
      const parsed = parseReply(reply, ctx.slots);
      return parsed.ok ? { ok: true, items: parsed.items } : { ok: false, error: 'invalid_reply', message: parsed.reason };
    } catch (e) {
      // After a timeout or an error the session's state is unknown, so start fresh next time.
      unload();
      if (e instanceof Error && e.message === 'timeout') return { ok: false, error: 'timeout' };
      return { ok: false, error: 'model', message: `The phone model failed: ${e instanceof Error ? e.message : String(e)}` };
    } finally {
      if (timer !== null) timers.clear(timer);
      if (session) idle = timers.set(unload, idleMs);
    }
  };

  return {
    id: 'phone',
    label: PHONE_LABEL,
    parse(text, ctx) {
      const next = queue.then(() => run(text, ctx));
      queue = next.catch(() => undefined);
      return next;
    },
    unload,
    isLoaded: () => session !== null,
  };
}
