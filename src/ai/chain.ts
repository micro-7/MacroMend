import { nextLocalMidnight } from '../core/day';
import type { Db } from '../db/db';
import { isSkipped, listProviders, recordError, setSkip, type ProviderRow } from '../db/providers';
import type { KeyStore } from './keyStore';
import { createCloudParser, type CallOptions } from './openaiCompat';
import type { ParseContext, ParsedItem, ParseErrorCode, Parser } from './types';

export type AttemptOutcome = 'ok' | ParseErrorCode | 'skipped' | 'no_key';

export interface Attempt {
  providerId: string;
  label: string;
  outcome: AttemptOutcome;
}

export type ChainFailure = 'no_providers' | 'offline' | 'all_failed';

export type ChainResult =
  | { ok: true; items: ParsedItem[]; providerId: string; label: string; attempts: Attempt[] }
  | { ok: false; reason: ChainFailure; attempts: Attempt[] };

/** What one provider's try returns: a value, or why it did not work. */
export type AttemptResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ParseErrorCode; retryAfterS?: number; message?: string };

export type ProviderRun<T> =
  | { ok: true; value: T; providerId: string; label: string; attempts: Attempt[] }
  | { ok: false; reason: ChainFailure; attempts: Attempt[] };

export interface ChainDeps {
  db: Db;
  keys: KeyStore;
  /** True when the phone has an internet connection. */
  isOnline: () => Promise<boolean>;
  now?: () => Date;
  call?: CallOptions;
  /** Test hook: build the parser for a provider. */
  makeParser?: (row: ProviderRow, apiKey: string) => Parser;
}

/**
 * Try the user's enabled providers in order until one does the task. Rate limits, daily quotas and rejected
 * keys put a provider on hold, so later requests skip it. Used for reading meals and for food estimates.
 */
export async function runProviders<T>(
  deps: ChainDeps,
  attempt: (row: ProviderRow, apiKey: string) => Promise<AttemptResult<T>>,
): Promise<ProviderRun<T>> {
  const now = deps.now ?? (() => new Date());
  const attempts: Attempt[] = [];
  const providers = (await listProviders(deps.db)).filter((p) => p.enabled);
  if (providers.length === 0) return { ok: false, reason: 'no_providers', attempts };
  if (!(await deps.isOnline())) return { ok: false, reason: 'offline', attempts };

  for (const row of providers) {
    const record = (outcome: AttemptOutcome) => attempts.push({ providerId: row.id, label: row.label, outcome });
    if (isSkipped(row, now())) {
      record('skipped');
      continue;
    }
    const apiKey = await deps.keys.get(row.id);
    if (!apiKey) {
      record('no_key');
      continue;
    }

    const result = await attempt(row, apiKey);
    if (result.ok) {
      await recordError(deps.db, row.id, null);
      record('ok');
      return { ok: true, value: result.value, providerId: row.id, label: row.label, attempts };
    }

    record(result.error);
    const detail = result.message ? `${result.error}: ${result.message}` : result.error;
    if (result.error === 'rate_limit') {
      await setSkip(deps.db, row.id, new Date(now().getTime() + (result.retryAfterS ?? 60) * 1000), 'rate_limit', detail);
    } else if (result.error === 'quota') {
      await setSkip(deps.db, row.id, nextLocalMidnight(now()), 'quota', detail);
    } else if (result.error === 'auth') {
      await setSkip(deps.db, row.id, 'forever', 'auth', detail);
    } else {
      await recordError(deps.db, row.id, detail);
    }
  }
  return { ok: false, reason: 'all_failed', attempts };
}

/** Read a meal typed by the user with the first provider that understands it. */
export async function runChain(deps: ChainDeps, text: string, ctx: ParseContext): Promise<ChainResult> {
  const r = await runProviders<ParsedItem[]>(deps, async (row, apiKey) => {
    const parser = deps.makeParser
      ? deps.makeParser(row, apiKey)
      : createCloudParser({ id: row.id, label: row.label, baseUrl: row.baseUrl, model: row.model, apiKey }, deps.call);
    const result = await parser.parse(text, ctx);
    return result.ok ? { ok: true, value: result.items } : result;
  });
  return r.ok ? { ok: true, items: r.value, providerId: r.providerId, label: r.label, attempts: r.attempts } : r;
}
