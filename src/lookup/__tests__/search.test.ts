import { res } from '../../ai/testing';
import { OFF_REAL, USDA_REAL } from '../__fixtures__/responses';
import { looksBranded, searchOnline, type OnlineSearchDeps } from '../search';

const deps = (fetchFn: unknown, over: Partial<OnlineSearchDeps> = {}): OnlineSearchDeps => ({
  enabled: true, isOnline: async () => true, usdaKey: null, userAgent: 'MacroMend/1.0.0', fetchFn: fetchFn as typeof fetch, ...over,
});

function byHost(answers: { usda?: () => Response; off?: () => Response }) {
  const calls: string[] = [];
  const fn = jest.fn(async (url: string) => {
    const host = new URL(String(url)).host;
    calls.push(host);
    if (host.includes('nal.usda.gov')) return answers.usda!();
    if (host.includes('openfoodfacts')) return answers.off!();
    throw new Error(`unexpected ${host}`);
  });
  return { fn, calls };
}

describe('searchOnline', () => {
  it('searches both databases and shows both sources, USDA first for plain food names', async () => {
    const f = byHost({ usda: () => res(200, USDA_REAL), off: () => res(200, OFF_REAL) });
    const r = await searchOnline('cheese', deps(f.fn));
    expect(r.ok && r.results.map((x) => x.source)).toEqual(['usda', 'openfoodfacts', 'usda', 'openfoodfacts', 'openfoodfacts']);
    expect(f.calls.sort()).toEqual(['api.nal.usda.gov', 'world.openfoodfacts.org']);
  });

  it('puts Open Food Facts first for brand-like searches', async () => {
    const f = byHost({ usda: () => res(200, USDA_REAL), off: () => res(200, OFF_REAL) });
    const r = await searchOnline('muscleblaze whey', deps(f.fn));
    expect(r.ok && r.results[0].source).toBe('openfoodfacts');
    expect(looksBranded('Amul butter')).toBe(true);
    expect(looksBranded('8901262150101')).toBe(true);
    expect(looksBranded('quinoa salad')).toBe(false);
  });

  it('caps the list at 10 and drops repeats of the same name and brand', async () => {
    const many = { foods: Array.from({ length: 12 }, (_, i) => ({ fdcId: i + 1, description: `FOOD ${i}`, foodNutrients: [{ nutrientNumber: '208', unitName: 'KCAL', value: 100 }, { nutrientNumber: '203', unitName: 'G', value: 5 }] })) };
    const dup = { foods: [{ ...many.foods[0], fdcId: 99 }, ...many.foods] };
    const f = byHost({ usda: () => res(200, dup), off: () => res(200, OFF_REAL) });
    const r = await searchOnline('food', deps(f.fn));
    expect(r.ok && r.results).toHaveLength(10);
    const names = r.ok ? r.results.map((x) => `${x.name}|${x.brand}`) : [];
    expect(new Set(names).size).toBe(names.length);
  });

  it('still works when one source fails, and says which', async () => {
    const f = byHost({ usda: () => res(429, 'slow down'), off: () => res(200, OFF_REAL) });
    const r = await searchOnline('muesli', deps(f.fn));
    expect(r).toMatchObject({ ok: true, usdaError: 'rate_limit' });
    expect(r.ok && r.results.every((x) => x.source === 'openfoodfacts')).toBe(true);
  });

  it('fails with a message when both sources fail', async () => {
    const f = byHost({ usda: () => res(500, 'x'), off: () => res(503, 'y') });
    const r = await searchOnline('muesli', deps(f.fn));
    expect(r).toMatchObject({ ok: false, reason: 'failed' });
  });

  it('does nothing when lookup is off or the phone is offline, and makes no requests', async () => {
    const f = byHost({ usda: () => res(200, USDA_REAL), off: () => res(200, OFF_REAL) });
    expect(await searchOnline('x', deps(f.fn, { enabled: false }))).toMatchObject({ ok: false, reason: 'disabled' });
    const off = await searchOnline('x', deps(f.fn, { isOnline: async () => false }));
    expect(off).toMatchObject({ ok: false, reason: 'offline', message: 'Online search needs internet.' });
    expect(f.fn).not.toHaveBeenCalled();
  });

  it('sends only the food name, never anything about the user', async () => {
    const f = byHost({ usda: () => res(200, USDA_REAL), off: () => res(200, OFF_REAL) });
    await searchOnline('yoga bar', deps(f.fn, { usdaKey: 'my-fdc-key' }));
    for (const [url, init] of f.fn.mock.calls as unknown as [string, RequestInit][]) {
      const u = new URL(String(url));
      expect([...u.searchParams.keys()].every((k) => ['query', 'pageSize', 'dataType', 'api_key', 'search_terms', 'search_simple', 'action', 'json', 'page_size', 'fields'].includes(k))).toBe(true);
      expect(String((init as { body?: string }).body ?? '')).toBe('');
    }
  });

  it('returns an empty list for an empty search without calling anyone', async () => {
    const f = byHost({});
    expect(await searchOnline('  ', deps(f.fn))).toEqual({ ok: true, results: [] });
    expect(f.fn).not.toHaveBeenCalled();
  });
});
