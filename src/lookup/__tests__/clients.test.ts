import { res } from '../../ai/testing';
import { guessCategoryFromName, guessCategoryFromTags } from '../category';
import { OFF_REAL, OFF_VARIANTS, USDA_REAL, USDA_VARIANTS } from '../__fixtures__/responses';
import { parseOffSearch, searchOff } from '../off';
import { parseUsdaSearch, searchUsda, tidyName } from '../usda';

describe('parseUsdaSearch (real response)', () => {
  const r = parseUsdaSearch(USDA_REAL);

  it('reads name, brand, calories, protein and serving per 100 g', () => {
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({
      source: 'usda', externalId: 'fdc:2057648', name: 'Cheddar cheese', brand: 'Grafton village',
      kcalPer100g: 393, proteinPer100g: 21.4, servingGrams: 28, servingLabel: '28 g (1 onz)', category: 'veg',
    });
    expect(r[1]).toMatchObject({ externalId: 'fdc:2021597', brand: 'Weis', proteinPer100g: 25 });
  });
});

describe('parseUsdaSearch (variants)', () => {
  const r = parseUsdaSearch(USDA_VARIANTS);

  it('accepts Atwater energy (958) and converts kilojoules', () => {
    expect(r.map((x) => [x.name, x.kcalPer100g, x.proteinPer100g])).toEqual([
      ['Chicken, breast, raw', 106, 22.5],
      ['Rice cooked', 130, 2.7],
    ]);
  });

  it('drops foods without protein, an id or a description', () => {
    expect(r).toHaveLength(2);
    expect(r[0].brand).toBeNull();
    expect(r[0].servingGrams).toBeNull();
    expect(r[0].category).toBe('non-veg');
  });

  it('returns nothing for unusable input', () => {
    expect(parseUsdaSearch(null)).toEqual([]);
    expect(parseUsdaSearch({})).toEqual([]);
    expect(parseUsdaSearch({ foods: 'x' })).toEqual([]);
  });

  it('tidies all-capitals names only', () => {
    expect(tidyName('CHEDDAR  CHEESE')).toBe('Cheddar cheese');
    expect(tidyName('Chicken, breast')).toBe('Chicken, breast');
  });
});

describe('parseOffSearch (real response)', () => {
  const r = parseOffSearch(OFF_REAL);

  it('reads name, first brand, calories, protein, serving and a category from tags', () => {
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({
      source: 'openfoodfacts', externalId: 'off:3168930010265', name: 'cruesly mélange de noix', brand: 'Quaker',
      kcalPer100g: 462, proteinPer100g: 8.5, servingGrams: 45, servingLabel: '45 g',
    });
    expect(r[2]).toMatchObject({ brand: 'The Jordans & Ryvita Company Limited - A Division of ABF Grain Products Limited', category: 'veg' });
  });

  it('does not trust "maybe vegetarian" or unknown status', () => {
    expect(r[0].category).toBeNull();
    expect(r[1].category).toBeNull();
  });
});

describe('parseOffSearch (variants)', () => {
  const r = parseOffSearch(OFF_VARIANTS);

  it('converts kilojoules to kcal, reads protein given as text, and drops products missing nutrients or a name', () => {
    expect(r.map((x) => x.name)).toEqual(['Plant whey', 'Egg white powder', 'Chicken salami']);
    expect(r[0]).toMatchObject({ kcalPer100g: 400.1, proteinPer100g: 80, servingGrams: null, category: 'vegan' });
  });

  it('makes egg and meat products egg and non-veg', () => {
    expect(r[1].category).toBe('egg');
    expect(r[2].category).toBe('non-veg');
  });

  it('returns nothing for unusable input', () => {
    expect(parseOffSearch(undefined)).toEqual([]);
    expect(parseOffSearch({ products: null })).toEqual([]);
  });
});

describe('category guesses', () => {
  it('guesses from the name', () => {
    expect(guessCategoryFromName('Butter chicken')).toBe('non-veg');
    expect(guessCategoryFromName('Egg whites')).toBe('egg');
    expect(guessCategoryFromName('Paneer tikka')).toBe('veg');
    expect(guessCategoryFromName('Tofu stir fry')).toBe('vegan');
    expect(guessCategoryFromName('Quinoa salad')).toBeNull();
  });

  it('uses OFF tags first', () => {
    expect(guessCategoryFromTags(['en:vegan'], 'whey')).toBe('vegan');
    expect(guessCategoryFromTags(['en:vegetarian'], 'cheese')).toBe('veg');
    expect(guessCategoryFromTags(['en:non-vegetarian'], 'sausage')).toBe('non-veg');
    expect(guessCategoryFromTags([], 'chicken soup')).toBe('non-veg');
  });
});

describe('searchUsda', () => {
  it('asks for the right things: the user key, or DEMO_KEY, and sends only the food name', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(200, USDA_REAL));
    const a = await searchUsda('cheddar cheese', 'my-fdc-key', { fetchFn: fetchFn as unknown as typeof fetch });
    expect(a).toMatchObject({ ok: true });
    const url = String(fetchFn.mock.calls[0][0]);
    expect(url).toContain('https://api.nal.usda.gov/fdc/v1/foods/search?query=cheddar%20cheese');
    expect(url).toContain('api_key=my-fdc-key');
    expect(url).toContain('pageSize=10');
    await searchUsda('x', null, { fetchFn: fetchFn as unknown as typeof fetch });
    expect(String(fetchFn.mock.calls[1][0])).toContain('api_key=DEMO_KEY');
  });

  it.each([
    [429, 'rate_limit'], [403, 'auth'], [500, 'network'],
  ])('maps HTTP %i to %s', async (status, error) => {
    const fetchFn = jest.fn().mockResolvedValue(res(status, 'x'));
    expect(await searchUsda('a', null, { fetchFn: fetchFn as unknown as typeof fetch })).toMatchObject({ ok: false, error });
  });

  it('reports bad JSON, a network failure and a timeout', async () => {
    expect(await searchUsda('a', null, { fetchFn: jest.fn().mockResolvedValue(res(200, '<html>')) as unknown as typeof fetch })).toMatchObject({ error: 'invalid_reply' });
    expect(await searchUsda('a', null, { fetchFn: jest.fn().mockRejectedValue(new TypeError('offline')) as unknown as typeof fetch })).toMatchObject({ error: 'network' });
    const hang = ((_u: string, init: RequestInit) => new Promise<Response>((_r, rej) => init.signal?.addEventListener('abort', () => rej(new Error('x'))))) as unknown as typeof fetch;
    expect(await searchUsda('a', null, { fetchFn: hang, timeoutMs: 20 })).toMatchObject({ error: 'timeout' });
  });
});

describe('searchOff', () => {
  it('sends the app name in User-Agent and only the search words', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(200, OFF_REAL));
    const r = await searchOff('muscleblaze whey', 'MacroMend/1.0.0 (Android)', { fetchFn: fetchFn as unknown as typeof fetch });
    expect(r).toMatchObject({ ok: true });
    const [url, init] = fetchFn.mock.calls[0];
    expect(String(url)).toContain('https://world.openfoodfacts.org/cgi/search.pl?search_terms=muscleblaze%20whey');
    expect(String(url)).toContain('json=1');
    expect(init.headers['User-Agent']).toBe('MacroMend/1.0.0 (Android)');
  });

  it('maps errors like the USDA client', async () => {
    expect(await searchOff('a', 'ua', { fetchFn: jest.fn().mockResolvedValue(res(429, '')) as unknown as typeof fetch })).toMatchObject({ error: 'rate_limit' });
    expect(await searchOff('a', 'ua', { fetchFn: jest.fn().mockResolvedValue(res(503, '')) as unknown as typeof fetch })).toMatchObject({ error: 'network' });
    expect(await searchOff('a', 'ua', { fetchFn: jest.fn().mockRejectedValue(new Error('x')) as unknown as typeof fetch })).toMatchObject({ error: 'network' });
  });
});
