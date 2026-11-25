import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { OFF_REAL, USDA_REAL } from '../../lookup/__fixtures__/responses';
import { DbProvider } from '../../db/DbContext';
import type { FoodRow } from '../../db/foods';
import { seedCatalog, findFoodByExactName } from '../../db/foods';
import { migrate } from '../../db/migrations';
import { createTestDb } from '../../db/testDb';
import { listSavedFoods } from '../../db/userFoods';
import type { EstimateResult } from '../../lookup/estimate';
import { parseOffSearch } from '../../lookup/off';
import type { OnlineSearchResult } from '../../lookup/search';
import type { LookupServices } from '../../lookup/services';
import { parseUsdaSearch } from '../../lookup/usda';
import { ATTRIBUTION, OnlineFoodFlow } from '../OnlineFoodFlow';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: ReactTestRenderer[] = [];
afterEach(async () => {
  await act(async () => mounted.splice(0).forEach((r) => r.unmount()));
});

const texts = (r: ReactTestRenderer | ReactTestInstance) =>
  (('root' in r ? r.root : r) as ReactTestInstance)
    .findAll((n) => (n.type as unknown as string) === 'Text')
    .map((n) => [n.props.children].flat(5).filter((c: unknown) => typeof c === 'string' || typeof c === 'number').join(''))
    .join(' | ');
const press = (r: ReactTestRenderer, role: string, label: string) => {
  const hit = r.root.findAll((n) => n.props.accessibilityRole === role && (n.props.accessibilityLabel === label || texts(n) === label))[0];
  if (!hit) throw new Error(`no ${role} "${label}" in: ${texts(r)}`);
  return hit;
};
const field = (r: ReactTestRenderer, label: string) => r.root.findAll((n) => (n.type as unknown as string) === 'TextInput' && n.props.accessibilityLabel === label)[0];

const found: OnlineSearchResult = { ok: true, results: [...parseOffSearch(OFF_REAL).slice(0, 2), ...parseUsdaSearch(USDA_REAL).slice(0, 1)] };
const estimateOk: EstimateResult = {
  ok: true, label: 'Groq',
  estimate: { name: 'Dhaba butter chicken', kcalPer100g: 170, proteinPer100g: 12, unit: 'plate', gramsPerUnit: 300, category: 'non-veg' },
};

async function setup(services: Partial<LookupServices>, query = 'bjorg muesli') {
  const db = createTestDb();
  await migrate(db);
  await seedCatalog(db);
  const saved: FoodRow[] = [];
  let closed = 0;
  const full: LookupServices = {
    search: async () => found,
    estimate: async () => estimateOk,
    ...services,
  };
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(
      <DbProvider value={db}>
        <OnlineFoodFlow visible query={query} services={full} onSaved={(f) => saved.push(f)} onClose={() => closed++} />
      </DbProvider>,
    );
  });
  mounted.push(r);
  return { db, r, saved, closed: () => closed };
}

describe('OnlineFoodFlow: results', () => {
  it('shows what was searched, each result with source and numbers per 100 g, and the data credits', async () => {
    const { r } = await setup({});
    const t = texts(r);
    expect(t).toContain('Looking for “bjorg muesli”. Only these words are sent.');
    expect(t).toContain('cruesly mélange de noix (Quaker)');
    expect(t).toContain('462 kcal · 8.5 g protein per 100 g');
    expect(t).toContain('Open Food Facts');
    expect(t).toContain('USDA');
    expect(t).toContain(ATTRIBUTION);
    expect(ATTRIBUTION).toMatch(/Open Food Facts \(ODbL/);
  });

  it('says when nothing was found', async () => {
    const { r } = await setup({ search: async () => ({ ok: true, results: [] }) });
    expect(texts(r)).toContain('Nothing found for “bjorg muesli”.');
    expect(texts(r)).toContain('None of these');
  });

  it('says online search needs internet when offline, and still offers an estimate or manual entry', async () => {
    const { r } = await setup({ search: async () => ({ ok: false, reason: 'offline', message: 'Online search needs internet.' }) });
    expect(texts(r)).toContain('Online search needs internet.');
    expect(texts(r)).toContain('Estimate with AI');
    expect(texts(r)).toContain('Enter the values myself');
  });

  it('says so when online lookup is switched off', async () => {
    const { r } = await setup({ search: async () => ({ ok: false, reason: 'disabled', message: 'Online food lookup is switched off in Settings.' }) });
    expect(texts(r)).toContain('Online food lookup is switched off in Settings.');
  });

  it('mentions a source that could not be searched', async () => {
    const { r } = await setup({ search: async () => ({ ...(found as Extract<OnlineSearchResult, { ok: true }>), usdaError: 'rate_limit' }) });
    expect(texts(r)).toContain('USDA could not be searched right now.');
  });
});

describe('OnlineFoodFlow: saving a result', () => {
  it('asks for the category (not guessed for this product), then saves it with the searched words and hands it back', async () => {
    const { r, db, saved } = await setup({});
    await act(async () => press(r, 'button', 'Pick muesli raisin,datte,figue').props.onPress());
    expect(texts(r)).toContain('What kind of food is it?');
    expect(texts(r)).toContain("We couldn't tell from the product.");
    const save = press(r, 'button', 'Save and use');
    expect(save.props.accessibilityState.disabled).toBe(true);
    await act(async () => press(r, 'radio', 'Vegetarian').props.onPress());
    await act(async () => press(r, 'button', 'Save and use').props.onPress());
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ source: 'openfoodfacts', category: 'veg', kcalPer100g: 352, unit: 'serving', gramsPerUnit: 60 });
    expect((await findFoodByExactName(db, 'bjorg muesli'))?.id).toBe(saved[0].id);
  });

  it('starts with the guessed category selected when the product says what it is', async () => {
    const { r } = await setup({ search: async () => ({ ok: true, results: [parseOffSearch(OFF_REAL)[2]] }) }, 'jordans muesli');
    await act(async () => press(r, 'button', 'Pick Special Muesli 30% fruits & noix').props.onPress());
    expect(texts(r)).toContain('We guessed from the product, please check.');
    expect(press(r, 'button', 'Save and use').props.accessibilityState.disabled).toBe(false);
  });

  it('goes back to the results', async () => {
    const { r } = await setup({});
    await act(async () => press(r, 'button', 'Pick cruesly mélange de noix').props.onPress());
    await act(async () => press(r, 'button', 'Back to results').props.onPress());
    expect(texts(r)).toContain('Looking for “bjorg muesli”');
  });
});

describe('OnlineFoodFlow: AI estimate', () => {
  it('"None of these" asks the AI, labels the numbers as an estimate to check, and saves them as ai-estimated', async () => {
    const { r, db, saved } = await setup({}, 'dhaba butter chicken');
    await act(async () => press(r, 'button', 'None of these').props.onPress());
    expect(texts(r)).toContain('Estimated by AI — check before saving');
    expect(field(r, 'Food name').props.value).toBe('Dhaba butter chicken');
    expect(field(r, 'Calories per 100 g').props.value).toBe('170');
    // the user corrects a number before saving
    await act(async () => field(r, 'Calories per 100 g').props.onChangeText('160'));
    await act(async () => press(r, 'button', 'Save estimate and use').props.onPress());
    expect(saved[0]).toMatchObject({ source: 'ai-estimated', kcalPer100g: 160, unit: 'plate', gramsPerUnit: 300, category: 'non-veg' });
    expect((await listSavedFoods(db)).map((f) => f.source)).toEqual(['ai-estimated']);
    expect((await findFoodByExactName(db, 'dhaba butter chicken'))?.id).toBe(saved[0].id);
  });

  it('will not save numbers that cannot be right, and says why', async () => {
    const { r, saved } = await setup({}, 'dhaba butter chicken');
    await act(async () => press(r, 'button', 'None of these').props.onPress());
    await act(async () => field(r, 'Calories per 100 g').props.onChangeText('50'));
    await act(async () => field(r, 'Protein per 100 g').props.onChangeText('40'));
    await act(async () => press(r, 'button', 'Save estimate and use').props.onPress());
    expect(texts(r)).toMatch(/doesn't fit/);
    expect(saved).toEqual([]);
  });

  it.each([
    ['no AI set up', 'No AI is set up, so you can enter the values yourself.'],
    ['rejected numbers', 'The AI gave numbers that cannot be right, so they were thrown away. Please enter the values yourself.'],
  ])('offers manual entry when the estimate fails (%s) and saves the typed values as the user\'s own food', async (_n, message) => {
    const { r, saved } = await setup({ estimate: async () => ({ ok: false, reason: 'no_providers', message }) }, 'quinoa salad');
    await act(async () => press(r, 'button', 'None of these').props.onPress());
    expect(texts(r)).toContain(message);
    expect(field(r, 'Food name').props.value).toBe('quinoa salad');
    expect(field(r, 'Calories per 100 g').props.value).toBe('');
    await act(async () => field(r, 'Calories per 100 g').props.onChangeText('120'));
    await act(async () => field(r, 'Protein per 100 g').props.onChangeText('4'));
    await act(async () => press(r, 'radio', 'Vegan').props.onPress());
    await act(async () => press(r, 'button', 'Save and use').props.onPress());
    expect(saved[0]).toMatchObject({ source: 'user', name: 'quinoa salad', category: 'vegan', kcalPer100g: 120 });
  });

  it('"Enter the values myself" skips the AI', async () => {
    const estimate = jest.fn();
    const { r } = await setup({ estimate }, 'homemade ladoo');
    await act(async () => press(r, 'button', 'Enter the values myself').props.onPress());
    expect(estimate).not.toHaveBeenCalled();
    expect(field(r, 'Food name').props.value).toBe('homemade ladoo');
  });
});

describe('OnlineFoodFlow: closing', () => {
  it('can be closed at any step', async () => {
    const { r, closed } = await setup({});
    await act(async () => press(r, 'button', 'Close').props.onPress());
    expect(closed()).toBe(1);
  });
});
