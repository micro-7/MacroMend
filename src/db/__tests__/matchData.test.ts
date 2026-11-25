import { matchFood } from '../../core/match';
import { loadMatchData, seedCatalog } from '../foods';
import { migrate } from '../migrations';
import { createTestDb } from '../testDb';

describe('loadMatchData', () => {
  it('builds a matcher and unit table from the food table in the database', async () => {
    const db = createTestDb();
    await migrate(db);
    await seedCatalog(db);
    const { index, units } = await loadMatchData(db);
    expect(matchFood('dahi', index)).toMatchObject({ foodId: 'in-curd', kind: 'exact' });
    expect(matchFood('panner', index)).toMatchObject({ foodId: 'in-paneer', kind: 'fuzzy' });
    expect(units.get('in-roti')).toEqual({ unit: 'piece' });
    expect(units.get('in-paneer')).toEqual({ unit: 'g' });
  });

  it('includes foods the user added later', async () => {
    const db = createTestDb();
    await migrate(db);
    await seedCatalog(db);
    await db.run(
      `INSERT INTO foods (id, name, aliases, category, unit, grams_per_unit, kcal_per_100g, protein_per_100g, source, updated_at)
       VALUES ('user-1', 'maa ka special sabzi', '["maa ki sabzi"]', 'veg', 'katori', 150, 100, 3, 'user', 'x')`,
    );
    const { index } = await loadMatchData(db);
    expect(matchFood('maa ki sabzi', index)).toMatchObject({ foodId: 'user-1' });
  });
});
