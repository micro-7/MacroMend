import { guessCategoryFromName } from './category';
import { LOOKUP_TIMEOUT_MS, type LookupOptions, type LookupResponse, type LookupResult } from './types';

export const USDA_DEMO_KEY = 'DEMO_KEY';
const BASE = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const DATA_TYPES = 'Foundation,SR Legacy,Survey (FNDDS),Branded';

interface UsdaNutrient {
  nutrientNumber?: string;
  nutrientId?: number;
  unitName?: string;
  value?: number;
}

interface UsdaFood {
  fdcId?: number;
  description?: string;
  brandName?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: UsdaNutrient[];
}

/** "CHEDDAR CHEESE" becomes "Cheddar cheese"; names that are not all capitals are left alone. */
export function tidyName(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ');
  if (t !== t.toUpperCase()) return t;
  const lower = t.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function nutrient(f: UsdaFood, numbers: string[]): UsdaNutrient | undefined {
  for (const n of numbers) {
    const hit = f.foodNutrients?.find((x) => x.nutrientNumber === n && typeof x.value === 'number');
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Turn USDA search results into lookup results. Energy is nutrient 208 (or the Atwater values 957 and 958
 * some reference foods use) and protein is 203; foods missing either are dropped. Values are per 100 g.
 */
export function parseUsdaSearch(json: unknown): LookupResult[] {
  const foods = (json as { foods?: UsdaFood[] } | null)?.foods;
  if (!Array.isArray(foods)) return [];
  const out: LookupResult[] = [];
  for (const f of foods) {
    if (!f.fdcId || !f.description) continue;
    const energy = nutrient(f, ['208', '958', '957']);
    const protein = nutrient(f, ['203']);
    if (!energy || !protein) continue;
    const kcal = energy.unitName?.toUpperCase() === 'KJ' ? energy.value! / 4.184 : energy.value!;
    const name = tidyName(f.description);
    const unit = f.servingSizeUnit?.toLowerCase();
    const servingGrams = f.servingSize && f.servingSize > 0 && (unit === 'g' || unit === 'grm' || unit === 'ml' || unit === 'mlt') ? f.servingSize : null;
    out.push({
      source: 'usda',
      externalId: `fdc:${f.fdcId}`,
      name,
      brand: f.brandName?.trim() ? tidyName(f.brandName) : f.brandOwner?.trim() ? tidyName(f.brandOwner) : null,
      kcalPer100g: Math.round(kcal * 10) / 10,
      proteinPer100g: Math.round(protein.value! * 10) / 10,
      servingGrams,
      servingLabel: servingGrams ? `${servingGrams} g${f.householdServingFullText ? ` (${f.householdServingFullText.toLowerCase()})` : ''}` : null,
      category: guessCategoryFromName(name),
    });
  }
  return out;
}

export async function searchUsda(query: string, apiKey: string | null, opts: LookupOptions = {}): Promise<LookupResponse> {
  const fetchFn = opts.fetchFn ?? fetch;
  const url = `${BASE}?query=${encodeURIComponent(query.trim())}&pageSize=${opts.limit ?? 10}&dataType=${encodeURIComponent(DATA_TYPES)}&api_key=${encodeURIComponent(apiKey || USDA_DEMO_KEY)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetchFn(url, { signal: controller.signal });
    const body = await res.text();
    if (res.status === 429) return { ok: false, error: 'rate_limit', message: 'USDA limit reached. A free USDA key in Settings gives a much higher limit.' };
    if (res.status === 401 || res.status === 403) return { ok: false, error: 'auth', message: 'The USDA key was rejected.' };
    if (!res.ok) return { ok: false, error: 'network', message: body.slice(0, 200) };
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      return { ok: false, error: 'invalid_reply' };
    }
    return { ok: true, results: parseUsdaSearch(json) };
  } catch (e) {
    if (controller.signal.aborted) return { ok: false, error: 'timeout' };
    return { ok: false, error: 'network', message: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}
