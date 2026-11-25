import { allowedCategories } from '../../core/diet';
import { ALL_FOODS } from '../../data/foods';
import { QUICK_PICKS } from '../../data/quickPicks';
import { seedCatalog } from '../foods';
import { migrate } from '../migrations';
import { listStaples, searchFoods, setStaples, updateUsualQty } from '../staples';
import { createTestDb } from '../testDb';

async function freshDb() {
  const db = createTestDb();
  await migrate(db);
  await seedCatalog(db);
  return db;
}

describe('searchFoods', () => {
  it('finds curd when searching its Hindi alias "dahi"', async () => {
    const db = await freshDb();
    const names = (await searchFoods(db, 'dahi')).map((f) => f.name);
    expect(names).toContain('curd');
  });

  it('hides non-veg foods for a vegetarian diet filter but shows them without one', async () => {
    const db = await freshDb();
    const veg = await searchFoods(db, 'chicken', { categories: allowedCategories('veg') });
    expect(veg.some((f) => f.category === 'non-veg')).toBe(false);
    const all = await searchFoods(db, 'chicken');
    expect(all.some((f) => f.name === 'chicken breast')).toBe(true);
  });

  it('puts names that start with the query first', async () => {
    const db = await freshDb();
    const results = await searchFoods(db, 'paneer');
    expect(results[0].name.startsWith('paneer')).toBe(true);
  });

  it('ignores case and extra spaces, and lists foods for an empty query', async () => {
    const db = await freshDb();
    expect((await searchFoods(db, '  DAHI ')).map((f) => f.name)).toContain('curd');
    expect((await searchFoods(db, '', { limit: 5 }))).toHaveLength(5);
  });

  it('returns nothing for an empty category list', async () => {
    const db = await freshDb();
    expect(await searchFoods(db, 'dal', { categories: [] })).toEqual([]);
  });
});

describe('staples', () => {
  it('saves, lists and replaces staples', async () => {
    const db = await freshDb();
    await setStaples(db, [
      { foodId: 'in-curd', usualQty: 1, usualUnit: 'katori' },
      { foodId: 'in-whey', usualQty: 1, usualUnit: 'scoop' },
    ]);
    expect((await listStaples(db)).map((s) => s.food.name)).toEqual(['curd', 'whey protein']);
    await setStaples(db, [{ foodId: 'in-roti', usualQty: 2, usualUnit: 'piece' }]);
    expect((await listStaples(db)).map((s) => s.foodId)).toEqual(['in-roti']);
  });

  it('updates a usual quantity', async () => {
    const db = await freshDb();
    await setStaples(db, [{ foodId: 'in-roti', usualQty: 1, usualUnit: 'piece' }]);
    await updateUsualQty(db, 'in-roti', 3);
    expect((await listStaples(db))[0].usualQty).toBe(3);
  });
});

describe('quick picks', () => {
  it('only name foods that exist and that the diet allows', () => {
    for (const [diet, ids] of Object.entries(QUICK_PICKS)) {
      const allowed = allowedCategories(diet as keyof typeof QUICK_PICKS);
      for (const id of ids) {
        const food = ALL_FOODS.find((f) => f.id === id);
        expect(food).toBeDefined();
        expect(allowed).toContain(food!.category);
      }
    }
  });

  it('gives vegetarians paneer, dal, roti, curd and whey', () => {
    expect(QUICK_PICKS.veg).toEqual(expect.arrayContaining(['in-paneer', 'in-dal', 'in-roti', 'in-curd', 'in-whey']));
  });
});
