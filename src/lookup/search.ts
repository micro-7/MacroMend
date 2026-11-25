import { normalizeName } from '../core/text';
import { searchOff } from './off';
import { searchTermsFor } from './searchTerms';
import type { LookupError, LookupOptions, LookupResponse, LookupResult } from './types';
import { searchUsda } from './usda';

/** Words that suggest a packaged product, so Open Food Facts results come first. */
const BRAND_WORDS = [
  'amul', 'muscleblaze', 'yoga bar', 'yogabar', 'mother dairy', 'britannia', 'parle', 'nestle', 'maggi', 'haldiram', 'patanjali', 'tata',
  'kellogg', 'kelloggs', 'quaker', 'saffola', 'optimum nutrition', 'myprotein', 'nature valley', 'cadbury', 'mtr', 'itc', 'aashirvaad',
  'dabur', 'epigamia', 'on gold standard', 'dymatize', 'bigmuscles', 'avvatar', 'whole truth', 'ritebite', 'fabindia', 'bournvita', 'horlicks',
  'complan', 'sunfeast', 'kurkure', 'lays', 'pringles', 'oreo', 'coca cola', 'pepsi', 'red bull',
];

export function looksBranded(query: string): boolean {
  const q = ` ${normalizeName(query)} `;
  return BRAND_WORDS.some((b) => q.includes(` ${b} `)) || /\b\d{8,14}\b/.test(q);
}

export type SearchFailure = 'disabled' | 'offline' | 'failed';

export type OnlineSearchResult =
  | { ok: true; results: LookupResult[]; usdaError?: LookupError; offError?: LookupError }
  | { ok: false; reason: SearchFailure; message: string };

export interface OnlineSearchDeps extends LookupOptions {
  /** The "Online food lookup" switch in Settings. */
  enabled: boolean;
  isOnline: () => Promise<boolean>;
  usdaKey: string | null;
  userAgent: string;
}

const dedupeKey = (r: LookupResult) => `${normalizeName(r.name)}|${normalizeName(r.brand ?? '')}`;

/** Alternate between two lists so both sources show up, dropping repeats and stopping at `cap`. */
function interleave(first: LookupResult[], second: LookupResult[], cap: number): LookupResult[] {
  const out: LookupResult[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < cap && (i < first.length || i < second.length); i++) {
    for (const r of [first[i], second[i]]) {
      if (!r || out.length >= cap) continue;
      const k = dedupeKey(r);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
    }
  }
  return out;
}

/**
 * Search USDA FoodData Central and Open Food Facts together for a food that is not in the table.
 * Only the food name is sent. Does nothing when lookup is switched off or the phone is offline.
 */
export async function searchOnline(query: string, deps: OnlineSearchDeps, cap = 10): Promise<OnlineSearchResult> {
  if (!deps.enabled) return { ok: false, reason: 'disabled', message: 'Online food lookup is switched off in Settings.' };
  if (!query.trim()) return { ok: true, results: [] };
  if (!(await deps.isOnline())) return { ok: false, reason: 'offline', message: 'Online search needs internet.' };

  const opts = { fetchFn: deps.fetchFn, timeoutMs: deps.timeoutMs, limit: deps.limit };
  const terms = searchTermsFor(query);
  const [usda, off]: [LookupResponse, LookupResponse] = await Promise.all([
    searchUsda(terms, deps.usdaKey, opts),
    searchOff(terms, deps.userAgent, opts),
  ]);
  if (!usda.ok && !off.ok) {
    const why = usda.message ?? off.message ?? 'Neither food database answered.';
    return { ok: false, reason: 'failed', message: `Couldn't search online. ${why}` };
  }
  const u = usda.ok ? usda.results : [];
  const o = off.ok ? off.results : [];
  const results = looksBranded(terms) ? interleave(o, u, cap) : interleave(u, o, cap);
  return { ok: true, results, usdaError: usda.ok ? undefined : usda.error, offError: off.ok ? undefined : off.error };
}
