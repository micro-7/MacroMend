import { matchFood } from '../../core/match';
import { OFF_REAL, USDA_REAL } from '../../lookup/__fixtures__/responses';
import { parseOffSearch } from '../../lookup/off';
import { parseUsdaSearch } from '../../lookup/usda';
import { findFoodByExactName, getFoodById, loadMatchData, seedCatalog } from '../foods';
import { getLog, listLogs, logFood } from '../logs';
import { MIGRATIONS, migrate } from '../migrations';
import { getSetting, isOnlineLookupEnabled, setOnlineLookupEnabled, setSetting } from '../settings';
import { checkNutrition, createFood, deleteFood, isEditableFood, listSavedFoods, saveExternalFood, updateFood } from '../userFoods';
import { createTestDb } from '../testDb';

async function freshDb() {
  const db = createTestDb();
  await migrate(db);
  await seedCatalog(db);
  return db;
}
const off = parseOffSearch(OFF_REAL);
const usda = parseUsdaSearch(USDA_REAL);
const DAY = '2026-11-25';

describe('migration v3 and settings', () => {
  it('adds the settings table and keeps working at the latest version', async () => {
    const db = await freshDb();
    expect(MIGRATIONS.length).toBeGreaterThanOrEqual(3);
    await setSetting(db, 'a', '1');
    await setSetting(db, 'a', '2');
    expect(await getSetting(db, 'a')).toBe('2');
    expect(await getSetting(db, 'missing')).toBeNull();
  });

  it('has online lookup on by default and remembers when it is switched off', async () => {
    const db = await freshDb();
    expect(await isOnlineLookupEnabled(db)).toBe(true);
    await setOnlineLookupEnabled(db, false);
    expect(await isOnlineLookupEnabled(db)).toBe(false);
    await setOnlineLookupEnabled(db, true);
    expect(await isOnlineLookupEnabled(db)).toBe(true);
  });
});

describe('saveExternalFood', () => {
  it('saves an Open Food Facts product with its source, id, serving, category and the searched words as an alias', async () => {
    const db = await freshDb();
    const f = await saveExternalFood(db, off[1], { category: 'veg', searchedName: 'bjorg muesli' });
    expect(f).toMatchObject({
      source: 'openfoodfacts', externalId: 'off:3229820129488', category: 'veg', unit: 'serving', gramsPerUnit: 60,
      kcalPer100g: 352, proteinPer100g: 11,
    });
    expect(f.id).toBe('ext-off-3229820129488');
    expect(f.name).toBe('muesli raisin,datte,figue (Bjorg)');
    expect(f.aliases).toEqual(expect.arrayContaining(['bjorg muesli']));
  });

  it('is found by name offline next time (the searched words and the product name)', async () => {
    const db = await freshDb();
    await saveExternalFood(db, off[1], { category: 'veg', searchedName: 'bjorg muesli' });
    expect((await findFoodByExactName(db, 'bjorg muesli'))?.externalId).toBe('off:3229820129488');
    expect((await findFoodByExactName(db, 'Muesli raisin, datte, figue'))?.source).toBe('openfoodfacts');
  });

  it('uses grams when the product has no serving size', async () => {
    const db = await freshDb();
    const f = await saveExternalFood(db, { ...usda[0], servingGrams: null, servingLabel: null }, { category: 'veg', searchedName: 'cheddar' });
    expect(f).toMatchObject({ unit: 'g', gramsPerUnit: 1, source: 'usda' });
  });

  it('saving the same online food twice reuses it and adds the new search words', async () => {
    const db = await freshDb();
    const a = await saveExternalFood(db, usda[0], { category: 'veg', searchedName: 'cheddar' });
    const b = await saveExternalFood(db, usda[0], { category: 'veg', searchedName: 'grafton cheese' });
    expect(b.id).toBe(a.id);
    expect(b.aliases).toEqual(expect.arrayContaining(['cheddar', 'grafton cheese']));
    expect((await listSavedFoods(db)).filter((f) => f.externalId === 'fdc:2057648')).toHaveLength(1);
    expect((await findFoodByExactName(db, 'grafton cheese'))?.id).toBe(a.id);
  });

  it('survives a catalog update, even when its source is "usda"', async () => {
    const db = await freshDb();
    const saved = await saveExternalFood(db, usda[0], { category: 'veg', searchedName: 'cheddar' });
    const off1 = await saveExternalFood(db, off[0], { category: 'veg', searchedName: 'cruesli' });
    await seedCatalog(db, [], 99); // a newer catalog that ships none of the old rows
    expect(await getFoodById(db, saved.id)).toMatchObject({ source: 'usda', kcalPer100g: 393 });
    expect(await getFoodById(db, off1.id)).not.toBeNull();
    expect(await getFoodById(db, 'in-roti')).toBeNull(); // bundled rows are replaced
  });

  it('rejects impossible numbers and saves nothing', async () => {
    const db = await freshDb();
    await expect(saveExternalFood(db, { ...off[0], kcalPer100g: 50, proteinPer100g: 40 }, { category: 'veg', searchedName: 'x' })).rejects.toThrow(/protein/i);
    expect(await listSavedFoods(db)).toEqual([]);
  });

  it('gets matched ahead of a bundled alias for the words the user searched', async () => {
    const db = await freshDb();
    // "yoga bar" is an alias of the bundled "protein bar"; the user picked a specific Yoga Bar product instead.
    const f = await saveExternalFood(db, { ...off[1], name: 'Yoga Bar Protein', brand: 'Yoga Bar' }, { category: 'veg', searchedName: 'yoga bar' });
    const { index } = await loadMatchData(db);
    expect(matchFood('yoga bar', index)?.foodId).toBe(f.id);
    expect((await findFoodByExactName(db, 'yoga bar'))?.id).toBe(f.id);
  });
});

describe('createFood and checkNutrition', () => {
  it('checks the numbers for any food', () => {
    expect(checkNutrition(150, 12)).toBeNull();
    expect(checkNutrition(901, 5)).toMatch(/between 0 and 900/);
    expect(checkNutrition(100, 101)).toMatch(/between 0 and 100/);
    expect(checkNutrition(50, 40)).toMatch(/doesn't fit/);
    expect(checkNutrition(NaN, 1)).toMatch(/numbers/);
    expect(checkNutrition(0, 0)).toBeNull();
  });

  it('adds a food the user typed in, as source "user"', async () => {
    const db = await freshDb();
    const f = await createFood(db, { name: 'Maa ki sabzi', category: 'veg', unit: 'katori', gramsPerUnit: 150, kcalPer100g: 90, proteinPer100g: 3, source: 'user' });
    expect(f).toMatchObject({ source: 'user', unit: 'katori' });
    expect(f.id).toMatch(/^user-/);
    expect((await findFoodByExactName(db, 'maa ki sabzi'))?.id).toBe(f.id);
  });

  it('refuses a blank name, bad portion weight or impossible numbers', async () => {
    const db = await freshDb();
    const base = { category: 'veg' as const, unit: 'g', gramsPerUnit: 1, kcalPer100g: 100, proteinPer100g: 5, source: 'user' as const };
    await expect(createFood(db, { ...base, name: '  ' })).rejects.toThrow(/name/);
    await expect(createFood(db, { ...base, name: 'x', gramsPerUnit: 0 })).rejects.toThrow(/Grams/);
    await expect(createFood(db, { ...base, name: 'x', kcalPer100g: 10, proteinPer100g: 30 })).rejects.toThrow();
    expect(await listSavedFoods(db)).toEqual([]);
  });
});

describe('estimated foods and the "est." mark', () => {
  const estimate = { name: 'Dhaba butter chicken', category: 'non-veg' as const, unit: 'plate', gramsPerUnit: 300, kcalPer100g: 170, proteinPer100g: 12, source: 'ai-estimated' as const };

  it('marks every entry of an AI-estimated food as estimated', async () => {
    const db = await freshDb();
    const f = await createFood(db, estimate);
    const e = await logFood(db, { date: DAY, slot: 'dinner', foodId: f.id, qty: 1, unit: 'plate' });
    expect(e.estimated).toBe(true);
    expect(e.grams).toBe(300);
    expect(e.kcal).toBeCloseTo(510, 5);
    expect((await listLogs(db, DAY))[0].estimated).toBe(true);
  });

  it('does not mark entries of ordinary foods', async () => {
    const db = await freshDb();
    const e = await logFood(db, { date: DAY, slot: 'lunch', foodId: 'in-roti', qty: 1, unit: 'piece' });
    expect(e.estimated).toBe(false);
  });

  it('after "values checked" the food becomes the user\'s own and new entries are not marked, old ones keep their mark', async () => {
    const db = await freshDb();
    const f = await createFood(db, estimate);
    const first = await logFood(db, { date: DAY, slot: 'dinner', foodId: f.id, qty: 1, unit: 'plate' });
    const edited = await updateFood(db, f.id, {
      name: f.name, aliases: f.aliases, category: f.category, unit: 'plate', gramsPerUnit: 300, kcalPer100g: 150, proteinPer100g: 11, checked: true,
    });
    expect(edited).toMatchObject({ source: 'user', kcalPer100g: 150 });
    const second = await logFood(db, { date: DAY, slot: 'dinner', foodId: f.id, qty: 1, unit: 'plate' });
    expect(second.estimated).toBe(false);
    expect(second.kcal).toBeCloseTo(450, 5);
    expect((await getLog(db, first.id))?.estimated).toBe(true);
    expect((await getLog(db, first.id))?.kcal).toBeCloseTo(510, 5);
  });

  it('keeps an estimate marked estimated when it is edited without ticking checked', async () => {
    const db = await freshDb();
    const f = await createFood(db, estimate);
    const edited = await updateFood(db, f.id, { name: f.name, aliases: [], category: 'non-veg', unit: 'plate', gramsPerUnit: 250, kcalPer100g: 170, proteinPer100g: 12 });
    expect(edited.source).toBe('ai-estimated');
  });
});

describe('managing saved foods', () => {
  it('lists only saved foods, never the bundled table', async () => {
    const db = await freshDb();
    expect(await listSavedFoods(db)).toEqual([]);
    await saveExternalFood(db, off[0], { category: 'veg', searchedName: 'a' });
    await createFood(db, { name: 'Mine', category: 'veg', unit: 'g', gramsPerUnit: 1, kcalPer100g: 100, proteinPer100g: 5, source: 'user' });
    await saveExternalFood(db, usda[0], { category: 'veg', searchedName: 'b' });
    expect((await listSavedFoods(db)).map((f) => f.source).sort()).toEqual(['openfoodfacts', 'usda', 'user']);
  });

  it('will not edit or delete a bundled food', async () => {
    const db = await freshDb();
    const roti = (await getFoodById(db, 'in-roti'))!;
    expect(isEditableFood(roti)).toBe(false);
    expect(isEditableFood((await getFoodById(db, 'usda-egg'))!)).toBe(false);
    await expect(updateFood(db, 'in-roti', { name: 'x', aliases: [], category: 'veg', unit: 'g', gramsPerUnit: 1, kcalPer100g: 1, proteinPer100g: 0 })).rejects.toThrow(/Built-in/);
    await expect(deleteFood(db, 'in-roti')).rejects.toThrow(/Built-in/);
    expect(await getFoodById(db, 'in-roti')).not.toBeNull();
  });

  it('deleting a saved food removes it and its staple entry, but past log entries keep their numbers', async () => {
    const db = await freshDb();
    const f = await createFood(db, { name: 'Mine', category: 'veg', unit: 'g', gramsPerUnit: 1, kcalPer100g: 100, proteinPer100g: 5, source: 'user' });
    await db.run("INSERT INTO staples (food_id, usual_qty, usual_unit) VALUES (?, 100, 'g')", [f.id]);
    const e = await logFood(db, { date: DAY, slot: 'lunch', foodId: f.id, qty: 200, unit: 'g' });
    await deleteFood(db, f.id);
    expect(await getFoodById(db, f.id)).toBeNull();
    expect(await findFoodByExactName(db, 'mine')).toBeNull();
    expect(await db.getAll('SELECT * FROM staples')).toEqual([]);
    const log = (await listLogs(db, DAY))[0];
    expect(log).toMatchObject({ id: e.id, kcal: 200, foodName: 'Removed food' });
  });

  it('renaming a food updates how it is found', async () => {
    const db = await freshDb();
    const f = await createFood(db, { name: 'Old name', category: 'veg', unit: 'g', gramsPerUnit: 1, kcalPer100g: 100, proteinPer100g: 5, source: 'user' });
    await updateFood(db, f.id, { name: 'New name', aliases: ['nn'], category: 'veg', unit: 'g', gramsPerUnit: 1, kcalPer100g: 100, proteinPer100g: 5 });
    expect(await findFoodByExactName(db, 'old name')).toBeNull();
    expect((await findFoodByExactName(db, 'nn'))?.id).toBe(f.id);
  });
});
