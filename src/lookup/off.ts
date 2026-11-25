import { guessCategoryFromTags } from './category';
import { LOOKUP_TIMEOUT_MS, type LookupOptions, type LookupResponse, type LookupResult } from './types';

const BASE = 'https://world.openfoodfacts.org/cgi/search.pl';
const FIELDS = 'code,product_name,brands,nutriments,serving_quantity,serving_size,labels_tags,ingredients_analysis_tags';

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: Record<string, unknown>;
  serving_quantity?: number | string;
  serving_size?: string;
  labels_tags?: string[];
  ingredients_analysis_tags?: string[];
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
};

/**
 * Turn Open Food Facts search results into lookup results. kcal comes from `energy-kcal_100g`, or from
 * `energy_100g` (kilojoules) divided by 4.184; protein from `proteins_100g`. Products missing a name,
 * calories or protein are dropped.
 */
export function parseOffSearch(json: unknown): LookupResult[] {
  const products = (json as { products?: OffProduct[] } | null)?.products;
  if (!Array.isArray(products)) return [];
  const out: LookupResult[] = [];
  for (const p of products) {
    const name = p.product_name?.trim();
    if (!p.code || !name) continue;
    const n = p.nutriments ?? {};
    let kcal = num(n['energy-kcal_100g']);
    if (kcal === null) {
      const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g']);
      kcal = kj === null ? null : kj / 4.184;
    }
    const protein = num(n['proteins_100g']);
    if (kcal === null || protein === null) continue;
    const serving = num(p.serving_quantity);
    const tags = [...(p.ingredients_analysis_tags ?? []), ...(p.labels_tags ?? [])];
    out.push({
      source: 'openfoodfacts',
      externalId: `off:${p.code}`,
      name,
      brand: p.brands?.split(',')[0]?.trim() || null,
      kcalPer100g: Math.round(kcal * 10) / 10,
      proteinPer100g: Math.round(protein * 10) / 10,
      servingGrams: serving && serving > 0 ? serving : null,
      servingLabel: p.serving_size?.trim() || null,
      category: guessCategoryFromTags(tags, name),
    });
  }
  return out;
}

export async function searchOff(query: string, userAgent: string, opts: LookupOptions = {}): Promise<LookupResponse> {
  const fetchFn = opts.fetchFn ?? fetch;
  const url = `${BASE}?search_terms=${encodeURIComponent(query.trim())}&search_simple=1&action=process&json=1&page_size=${opts.limit ?? 10}&fields=${FIELDS}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? LOOKUP_TIMEOUT_MS);
  try {
    // Open Food Facts asks every app to say who it is.
    const res = await fetchFn(url, { signal: controller.signal, headers: { 'User-Agent': userAgent } });
    const body = await res.text();
    if (res.status === 429) return { ok: false, error: 'rate_limit', message: 'Open Food Facts is busy. Try again in a moment.' };
    if (!res.ok) return { ok: false, error: 'network', message: body.slice(0, 200) };
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      return { ok: false, error: 'invalid_reply' };
    }
    return { ok: true, results: parseOffSearch(json) };
  } catch (e) {
    if (controller.signal.aborted) return { ok: false, error: 'timeout' };
    return { ok: false, error: 'network', message: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}
