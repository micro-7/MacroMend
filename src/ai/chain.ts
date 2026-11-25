import { nextLocalMidnight } from '../core/day';
import type { Db } from '../db/db';
import { allProvidersOutOfQuota, isSkipped, listProviders, recordError, setSkip, type ProviderRow } from '../db/providers';
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

/** Why reading a meal failed: the cloud reasons, or "phone model only" is on and the model is not downloaded. */
export type ChainFailureWithPhone = ChainFailure | 'phone_unavailable';

export type ChainResult =
  | { ok: true; items: ParsedItem[]; providerId: string; label: string; attempts: Attempt[] }
  | { ok: false; reason: ChainFailureWithPhone; attempts: Attempt[] };

/** What one provider's try returns: a value, or why it did not work. */
export type AttemptResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ParseErrorCode; retryAfterS?: number; message?: string };

export type ProviderRun<T> =
  | { ok: true; value: T; providerId: string; label: string; attempts: Attempt[] }
  | { ok: false; reason: ChainFailure; attempts: Attempt[] };

/** The phone model as one more way to read a meal. */
export interface PhoneDeps {
  parser: Parser;
  /** True when the model is downloaded and the phone can run it. */
  isReady: () => boolean;
}

export const PHONE_ID = 'phone';

export interface ChainDeps {
  db: Db;
  keys: KeyStore;
  /** True when the phone has an internet connection. */
  isOnline: () => Promise<boolean>;
  /** The on-device model, used after (or instead of) the cloud providers. */
  phone?: PhoneDeps;
  /** True while "Always use phone model" is on: nothing is sent to the cloud. */
  phoneOnly?: () => boolean | Promise<boolean>;
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

/**
 * Read a meal typed by the user. The order is:
 * 1. "Always use phone model" on: the phone model only (or nothing, if it is not downloaded).
 * 2. Otherwise the cloud providers in the user's order, then the phone model, then manual pick.
 *    The cloud is skipped (and the phone model used) when there is none set up, when the phone is offline, and
 *    when every provider has used up its daily limit; cloud providers are tried again the next day.
 */
export async function runChain(deps: ChainDeps, text: string, ctx: ParseContext): Promise<ChainResult> {
  const now = deps.now ?? (() => new Date());
  const phoneReady = !!deps.phone && deps.phone.isReady();

  const tryPhone = async (attempts: Attempt[]): Promise<ChainResult | null> => {
    const r = await deps.phone!.parser.parse(text, ctx);
    if (r.ok) {
      attempts.push({ providerId: PHONE_ID, label: deps.phone!.parser.label, outcome: 'ok' });
      return { ok: true, items: r.items, providerId: PHONE_ID, label: deps.phone!.parser.label, attempts };
    }
    attempts.push({ providerId: PHONE_ID, label: deps.phone!.parser.label, outcome: r.error });
    return null;
  };

  if (await deps.phoneOnly?.()) {
    const attempts: Attempt[] = [];
    if (!phoneReady) return { ok: false, reason: 'phone_unavailable', attempts };
    return (await tryPhone(attempts)) ?? { ok: false, reason: 'all_failed', attempts };
  }

  const providers = await listProviders(deps.db);
  const skipCloud =
    providers.filter((p) => p.enabled).length === 0 || !(await deps.isOnline()) || allProvidersOutOfQuota(providers, now());

  let cloud: ChainResult = { ok: false, reason: 'no_providers', attempts: [] };
  if (!skipCloud) {
    const r = await runProviders<ParsedItem[]>(deps, async (row, apiKey) => {
      const parser = deps.makeParser
        ? deps.makeParser(row, apiKey)
        : createCloudParser({ id: row.id, label: row.label, baseUrl: row.baseUrl, model: row.model, apiKey }, deps.call);
      const result = await parser.parse(text, ctx);
      return result.ok ? { ok: true, value: result.items } : result;
    });
    if (r.ok) return { ok: true, items: r.value, providerId: r.providerId, label: r.label, attempts: r.attempts };
    cloud = r;
  } else {
    // Say why the cloud was not used, the same way runProviders does.
    if (providers.filter((p) => p.enabled).length === 0) cloud = { ok: false, reason: 'no_providers', attempts: [] };
    else if (!(await deps.isOnline())) cloud = { ok: false, reason: 'offline', attempts: [] };
    else {
      cloud = {
        ok: false,
        reason: 'all_failed',
        attempts: providers.filter((p) => p.enabled).map((p) => ({ providerId: p.id, label: p.label, outcome: 'skipped' as const })),
      };
    }
  }

  if (!phoneReady) return cloud;
  const attempts = [...cloud.attempts];
  return (await tryPhone(attempts)) ?? { ok: false, reason: 'all_failed', attempts };
}
