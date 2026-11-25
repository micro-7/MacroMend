import { createTestDb } from '../testDb';
import { countFoods } from '../foods';
import { initDatabase } from '../init';

describe('initDatabase', () => {
  it('migrates and seeds a fresh database', async () => {
    const db = await initDatabase(async () => createTestDb());
    expect(await countFoods(db)).toBeGreaterThanOrEqual(300);
  });

  it('rejects when the database cannot be opened', async () => {
    await expect(
      initDatabase(async () => {
        throw new Error('disk full');
      }),
    ).rejects.toThrow('disk full');
  });

  it('rejects when the database is newer than the app instead of continuing', async () => {
    const db = createTestDb();
    await db.exec('PRAGMA user_version = 99');
    await expect(initDatabase(async () => db)).rejects.toThrow(/newer/);
  });
});
