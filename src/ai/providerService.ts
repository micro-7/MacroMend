import type { Db } from '../db/db';
import {
  addProvider, clearSkip, deleteProvider, getProvider, recordError, setSkip, updateProvider,
  type ProviderKind, type ProviderRow,
} from '../db/providers';
import { nextLocalMidnight } from '../core/day';
import type { KeyStore } from './keyStore';
import { createCloudParser, type CallOptions } from './openaiCompat';
import { PRESETS } from './presets';
import type { ParseErrorCode } from './types';

export interface ProviderFormValues {
  kind: ProviderKind;
  label: string;
  baseUrl: string;
  model: string;
  /** The key as typed. Empty while editing means "keep the saved key". */
  apiKey: string;
}

export type FormErrors = Partial<Record<keyof ProviderFormValues, string>>;

export function validateProviderForm(v: ProviderFormValues, editing: boolean): FormErrors {
  const e: FormErrors = {};
  if (!v.label.trim()) e.label = 'Give it a name.';
  if (!/^https:\/\/\S+$/i.test(v.baseUrl.trim())) e.baseUrl = 'Enter the service address, starting with https://';
  if (!v.model.trim()) e.model = 'Enter a model name.';
  if (!editing && !v.apiKey.trim()) e.apiKey = 'Paste your API key.';
  return e;
}

/** Values to start the form with for a new provider of this kind. */
export function defaultsFor(kind: ProviderKind): ProviderFormValues {
  const p = PRESETS[kind];
  return { kind, label: p.label, baseUrl: p.baseUrl, model: p.model, apiKey: '' };
}

export async function createProvider(db: Db, keys: KeyStore, v: ProviderFormValues): Promise<ProviderRow> {
  const row = await addProvider(db, { kind: v.kind, label: v.label, baseUrl: v.baseUrl, model: v.model });
  await keys.set(row.id, v.apiKey.trim());
  return row;
}

/** Save changes. A new key, address or model gives the provider a fresh start (any hold on it is cleared). */
export async function saveProvider(db: Db, keys: KeyStore, id: string, v: ProviderFormValues): Promise<void> {
  await updateProvider(db, id, { label: v.label, baseUrl: v.baseUrl, model: v.model });
  if (v.apiKey.trim()) {
    await keys.set(id, v.apiKey.trim());
    await clearSkip(db, id);
  }
}

/** Delete a provider and its key. */
export async function removeProvider(db: Db, keys: KeyStore, id: string): Promise<void> {
  await keys.delete(id);
  await deleteProvider(db, id);
}

/** What to tell the user when a provider fails, in plain words. */
export function errorMessage(code: ParseErrorCode): string {
  switch (code) {
    case 'auth': return 'The key was rejected. Check that you pasted the whole key.';
    case 'rate_limit': return 'Rate limited. The key works, but wait a minute and try again.';
    case 'quota': return "Today's free limit is used up. The key works; try again tomorrow.";
    case 'model': return "The model name wasn't found. Check the model name.";
    case 'network': return "Couldn't reach the service. Check your internet connection and the address.";
    case 'timeout': return "No reply within 8 seconds. Try again, or pick a faster model.";
    case 'invalid_reply': return "Reached the model, but it didn't answer in the expected format. Try a different model.";
  }
}

export type TestResult = { ok: true } | { ok: false; error: ParseErrorCode; message: string };

/**
 * Try a provider with a tiny request. When it belongs to a saved provider, the result is remembered:
 * success clears any hold; a rejected key or used-up limit puts it on hold.
 */
export async function testProvider(
  v: Pick<ProviderFormValues, 'label' | 'baseUrl' | 'model'> & { apiKey: string },
  opts: CallOptions & { db?: Db; providerId?: string; now?: Date } = {},
): Promise<TestResult> {
  const parser = createCloudParser({ id: opts.providerId ?? 'test', label: v.label, baseUrl: v.baseUrl, model: v.model, apiKey: v.apiKey }, opts);
  const r = await parser.parse('1 roti', { slots: [{ id: 'lunch', name: 'Lunch' }] });
  if (r.ok) {
    if (opts.db && opts.providerId) {
      await clearSkip(opts.db, opts.providerId);
      await recordError(opts.db, opts.providerId, null);
    }
    return { ok: true };
  }
  const message = errorMessage(r.error);
  if (opts.db && opts.providerId) {
    const now = opts.now ?? new Date();
    if (r.error === 'auth') await setSkip(opts.db, opts.providerId, 'forever', 'auth', message);
    else if (r.error === 'quota') await setSkip(opts.db, opts.providerId, nextLocalMidnight(now), 'quota', message);
    else if (r.error === 'rate_limit') await setSkip(opts.db, opts.providerId, new Date(now.getTime() + (r.retryAfterS ?? 60) * 1000), 'rate_limit', message);
    else await recordError(opts.db, opts.providerId, message);
  }
  return { ok: false, error: r.error, message };
}

export { getProvider };
