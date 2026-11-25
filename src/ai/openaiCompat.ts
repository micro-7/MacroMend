import { buildMessages, type ChatMessage } from './prompt';
import { parseReply } from './schema';
import type { ParseContext, ParseErrorCode, ParseResult, Parser } from './types';

export const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRY_AFTER_S = 60;

export interface CloudProvider {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface CallOptions {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export type CallResult =
  | { ok: true; text: string }
  | { ok: false; error: ParseErrorCode; retryAfterS?: number; message?: string };

const DAILY = /per[\s_-]?day|daily|\bRPD\b|\bTPD\b/i;
const MODEL_PROBLEM = /model[^.]{0,60}(not found|does not exist|decommission|not available|not supported|invalid)|model_not_found|no such model/i;
const JSON_MODE_PROBLEM = /response_format|json_object|json mode/i;

/** Seconds from a Retry-After header (seconds or a date); null if absent or unreadable. */
function retryAfterSeconds(header: string | null | undefined, now: number = Date.now()): number | null {
  if (!header) return null;
  const secs = Number(header);
  if (Number.isFinite(secs) && secs >= 0) return Math.ceil(secs);
  const at = Date.parse(header);
  return Number.isNaN(at) ? null : Math.max(0, Math.ceil((at - now) / 1000));
}

/** Decide what a failed HTTP response means for the chain. */
export function mapHttpError(status: number, body: string, retryAfterHeader?: string | null): Extract<CallResult, { ok: false }> {
  const message = body.slice(0, 300);
  if (status === 429) {
    if (DAILY.test(body)) return { ok: false, error: 'quota', message };
    return { ok: false, error: 'rate_limit', retryAfterS: retryAfterSeconds(retryAfterHeader) ?? DEFAULT_RETRY_AFTER_S, message };
  }
  if (status === 401 || status === 403) return { ok: false, error: 'auth', message };
  if (status === 404 || ((status === 400 || status === 422) && MODEL_PROBLEM.test(body))) return { ok: false, error: 'model', message };
  if (status === 408) return { ok: false, error: 'timeout', message };
  if (status >= 500) return { ok: false, error: 'network', message };
  return { ok: false, error: 'model', message };
}

function contentOf(json: unknown): string | null {
  const msg = (json as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) {
    const text = msg.map((p) => (typeof p === 'string' ? p : (p as { text?: string })?.text ?? '')).join('');
    return text || null;
  }
  return null;
}

async function post(p: CloudProvider, messages: ChatMessage[], jsonMode: boolean, fetchFn: typeof fetch, timeoutMs: number): Promise<CallResult & { status?: number; body?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(`${p.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.apiKey}` },
      body: JSON.stringify({
        model: p.model,
        messages,
        temperature: 0,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });
    const raw = await res.text();
    if (!res.ok) return { ...mapHttpError(res.status, raw, res.headers?.get?.('retry-after')), status: res.status, body: raw };
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'invalid_reply', message: 'The reply was not JSON.' };
    }
    const text = contentOf(json);
    return text === null ? { ok: false, error: 'invalid_reply', message: 'The reply had no text.' } : { ok: true, text };
  } catch (e) {
    if (controller.signal.aborted) return { ok: false, error: 'timeout' };
    return { ok: false, error: 'network', message: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Send one chat request to an OpenAI-compatible endpoint and return the reply text.
 * Asks for JSON mode first; if the service rejects that field, asks again once without it.
 */
export async function callChat(p: CloudProvider, messages: ChatMessage[], opts: CallOptions = {}): Promise<CallResult> {
  const fetchFn = opts.fetchFn ?? fetch;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const first = await post(p, messages, true, fetchFn, timeoutMs);
  if (!first.ok && first.status === 400 && first.body && JSON_MODE_PROBLEM.test(first.body)) {
    return post(p, messages, false, fetchFn, timeoutMs);
  }
  return first;
}

/** A parser backed by one cloud provider. */
export function createCloudParser(p: CloudProvider, opts: CallOptions = {}): Parser {
  return {
    id: p.id,
    label: p.label,
    async parse(text: string, ctx: ParseContext): Promise<ParseResult> {
      const r = await callChat(p, buildMessages(text, ctx.slots), opts);
      if (!r.ok) return r;
      const reply = parseReply(r.text, ctx.slots);
      return reply.ok ? { ok: true, items: reply.items } : { ok: false, error: 'invalid_reply', message: reply.reason };
    },
  };
}
