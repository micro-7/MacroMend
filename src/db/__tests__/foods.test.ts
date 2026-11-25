import type { FoodSeed } from '../../data/foods';
import { countFoods, findFoodByExactName, getFoodById, seedCatalog } from '../foods';
import { migrate } from '../migrations';
import { createTestDb } from '../testDb';

async function freshDb() {
  const db = createTestDb();
  await migrate(db);
  return db;
}

const seed = (over: Partial<FoodSeed> = {}): FoodSeed => ({
  id: 'in-test',
  name: 'test food',
  aliases: ['tf'],
  category: 'veg',
  unit: 'g',
  gramsPerUnit: 1,
  kcalPer100g: 100,
  proteinPer100g: 5,
  source: 'built-in',
  ...over,
});

describe('seedCatalog', () => {
  it('loads at least 300 foods on first seed', async () => {
    const db = await freshDb();
    expect(await seedCatalog(db)).toBe(true);
    expect(await countFoods(db)).toBeGreaterThanOrEqual(300);
  });

  it('does nothing when the stored version is current', async () => {
    const db = await freshDb();
    await seedCatalog(db);
    expect(await seedCatalog(db)).toBe(false);
  });

  it('updates built-in rows but leaves user foods alone on a newer catalog', async () => {
    const db = await freshDb();
    await seedCatalog(db, [seed()], 1);
    await db.run(
      `INSERT INTO foods (id, name, aliases, category, unit, grams_per_unit, kcal_per_100g, protein_per_100g, source, updated_at)
       VALUES ('user-1', 'my shake', '[]', 'veg', 'g', 1, 111, 22, 'user', 'x')`,
    );
    await seedCatalog(db, [seed({ kcalPer100g: 150 })], 2);
    expect((await getFoodById(db, 'in-test'))?.kcalPer100g).toBe(150);
    const mine = await getFoodById(db, 'user-1');
    expect(mine?.kcalPer100g).toBe(111);
    expect(mine?.source).toBe('user');
  });

  it('removes bundled foods that no longer ship but keeps user foods', async () => {
    const db = await freshDb();
    await seedCatalog(db, [seed(), seed({ id: 'in-old', name: 'old food', aliases: [] })], 1);
    await db.run(
      `INSERT INTO foods (id, name, aliases, category, unit, grams_per_unit, kcal_per_100g, protein_per_100g, source, updated_at)
       VALUES ('user-1', 'my shake', '[]', 'veg', 'g', 1, 111, 22, 'user', 'x')`,
    );
    await seedCatalog(db, [seed()], 2);
    expect(await getFoodById(db, 'in-old')).toBeNull();
    expect(await getFoodById(db, 'user-1')).not.toBeNull();
  });
});

describe('findFoodByExactName', () => {
  it('finds foods by name or alias ignoring case and spacing', async () => {
    const db = await freshDb();
    await seedCatalog(db);
    expect((await findFoodByExactName(db, 'dahi'))?.name).toBe('curd');
    expect((await findFoodByExactName(db, 'chapati'))?.name).toBe('roti');
    expect((await findFoodByExactName(db, ' Paneer  '))?.name).toBe('paneer');
  });

  it('returns null for unknown or empty input', async () => {
    const db = await freshDb();
    await seedCatalog(db);
    expect(await findFoodByExactName(db, 'zzz not a food')).toBeNull();
    expect(await findFoodByExactName(db, '   ')).toBeNull();
  });

  it('has the staples the spec names, with the right categories', async () => {
    const db = await freshDb();
    await seedCatalog(db);
    const expectCat = async (q: string, cat: string) =>
      expect((await findFoodByExactName(db, q))?.category).toBe(cat);
    for (const q of ['paneer', 'dal', 'roti', 'curd', 'rice', 'whey protein', 'egg', 'chicken breast', 'oats']) {
      expect(await findFoodByExactName(db, q)).not.toBeNull();
    }
    await expectCat('paneer', 'veg');
    await expectCat('curd', 'veg');
    await expectCat('egg', 'egg');
    await expectCat('chicken breast', 'non-veg');
    await expectCat('tofu', 'vegan');
  });
});
