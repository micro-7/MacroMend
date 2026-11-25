import type { FoodCategory } from '../core/diet';

/** One food found online, with its numbers per 100 g. */
export interface LookupResult {
  source: 'usda' | 'openfoodfacts';
  /** "fdc:2057648" or "off:3168930010265". */
  externalId: string;
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  /** Grams in one serving, when the source says. */
  servingGrams: number | null;
  /** The serving as the source describes it, such as "45 g". */
  servingLabel: string | null;
  /** A best guess the user confirms; null when there is nothing to go on. */
  category: FoodCategory | null;
}

export type LookupError = 'rate_limit' | 'auth' | 'network' | 'timeout' | 'invalid_reply';

export type LookupResponse = { ok: true; results: LookupResult[] } | { ok: false; error: LookupError; message?: string };

export interface LookupOptions {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  limit?: number;
}

export const LOOKUP_TIMEOUT_MS = 8000;
