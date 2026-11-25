import { seedCatalog } from '../foods';
import { deleteLog, getLog, listLogs, logFood, updateLog } from '../logs';
import { migrate } from '../migrations';
import { createTestDb } from '../testDb';

async function freshDb() {
  const db = createTestDb();
  await migrate(db);
  await seedCatalog(db);
  return db;
}

const DAY = '2026-11-25';

describe('logFood', () => {
  it('saves 2 roti with grams, kcal and protein from the food table', async () => {
    const db = await freshDb();
    const e = await logFood(db, { date: DAY, slot: 'lunch', foodId: 'in-roti', qty: 2, unit: 'piece' });
    expect(e).toMatchObject({ foodName: 'roti', qty: 2, unit: 'piece', grams: 80, slot: 'lunch', date: DAY, estimated: false, rawText: null });
    expect(e.kcal).toBeCloseTo(237.6, 5);
    expect(e.proteinG).toBeCloseTo(7.84, 5);
  });

  it('converts household measures (1 katori dal = 150 g) and half scoops', async () => {
    const db = await freshDb();
    expect((await logFood(db, { date: DAY, slot: 'lunch', foodId: 'in-dal', qty: 1, unit: 'katori' })).grams).toBe(150);
    expect((await logFood(db, { date: DAY, slot: 'snack', foodId: 'in-whey', qty: 0.5, unit: 'scoop' })).grams).toBe(15);
  });

  it('keeps the typed text and the estimated flag when given', async () => {
    const db = await freshDb();
    const e = await logFood(db, { date: DAY, slot: 'dinner', foodId: 'in-roti', qty: 1, unit: 'piece', rawText: 'ek roti', estimated: true });
    expect(e.rawText).toBe('ek roti');
    expect(e.estimated).toBe(true);
  });

  it('refuses a bad quantity, an unknown unit or an unknown food, and saves nothing', async () => {
    const db = await freshDb();
    await expect(logFood(db, { date: DAY, slot: 'lunch', foodId: 'in-roti', qty: 0, unit: 'piece' })).rejects.toThrow(/above zero/);
    await expect(logFood(db, { date: DAY, slot: 'lunch', foodId: 'in-roti', qty: 51, unit: 'piece' })).rejects.toThrow();
    await expect(logFood(db, { date: DAY, slot: 'lunch', foodId: 'in-roti', qty: 1, unit: 'plate' })).rejects.toThrow(/Unknown unit/);
    await expect(logFood(db, { date: DAY, slot: 'lunch', foodId: 'nope', qty: 1, unit: 'piece' })).rejects.toThrow(/no longer/);
    expect(await listLogs(db, DAY)).toEqual([]);
  });

  it('keeps an entry unchanged when the food is edited later', async () => {
    const db = await freshDb();
    const e = await logFood(db, { date: DAY, slot: 'lunch', foodId: 'in-paneer', qty: 100, unit: 'g' });
    await db.run("UPDATE foods SET kcal_per_100g = 999, protein_per_100g = 50 WHERE id = 'in-paneer'");
    const again = await getLog(db, e.id);
    expect(again?.kcal).toBe(e.kcal);
    expect(again?.proteinG).toBe(e.proteinG);
  });
});

describe('listLogs', () => {
  it('returns only the given date, oldest first', async () => {
    const db = await freshDb();
    await logFood(db, { date: '2026-11-24', slot: 'dinner', foodId: 'in-rice', qty: 1, unit: 'katori' });
    await logFood(db, { date: DAY, slot: 'breakfast', foodId: 'in-roti', qty: 1, unit: 'piece' });
    await logFood(db, { date: DAY, slot: 'lunch', foodId: 'in-dal', qty: 1, unit: 'katori' });
    expect((await listLogs(db, DAY)).map((l) => l.foodName)).toEqual(['roti', 'dal']);
    expect((await listLogs(db, '2026-11-24')).map((l) => l.foodName)).toEqual(['white rice']);
    expect(await listLogs(db, '2026-11-26')).toEqual([]);
  });

  it('still lists an entry whose food was removed from the catalog', async () => {
    const db = await freshDb();
    await logFood(db, { date: DAY, slot: 'lunch', foodId: 'in-roti', qty: 1, unit: 'piece' });
    await db.run("DELETE FROM foods WHERE id = 'in-roti'");
    expect((await listLogs(db, DAY))[0].foodName).toBe('Removed food');
  });
});

describe('updateLog and deleteLog', () => {
  it('changes quantity, unit and slot and recalculates', async () => {
    const db = await freshDb();
    const e = await logFood(db, { date: DAY, slot: 'lunch', foodId: 'in-roti', qty: 2, unit: 'piece' });
    const u = await updateLog(db, e.id, { qty: 3, unit: 'piece', slot: 'dinner' });
    expect(u).toMatchObject({ id: e.id, qty: 3, grams: 120, slot: 'dinner' });
    expect(u.kcal).toBeCloseTo(356.4, 5);
  });

  it('rejects an invalid update without changing the entry', async () => {
    const db = await freshDb();
    const e = await logFood(db, { date: DAY, slot: 'lunch', foodId: 'in-roti', qty: 2, unit: 'piece' });
    await expect(updateLog(db, e.id, { qty: 0, unit: 'piece', slot: 'lunch' })).rejects.toThrow();
    expect((await getLog(db, e.id))?.qty).toBe(2);
    await expect(updateLog(db, 9999, { qty: 1, unit: 'piece', slot: 'lunch' })).rejects.toThrow(/no longer exists/);
  });

  it('deletes an entry', async () => {
    const db = await freshDb();
    const e = await logFood(db, { date: DAY, slot: 'lunch', foodId: 'in-roti', qty: 2, unit: 'piece' });
    await deleteLog(db, e.id);
    expect(await getLog(db, e.id)).toBeNull();
    expect(await listLogs(db, DAY)).toEqual([]);
  });
});
