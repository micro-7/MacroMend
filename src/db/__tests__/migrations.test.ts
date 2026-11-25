import { createTestDb } from '../testDb';
import { MIGRATIONS, migrate } from '../migrations';

const TABLES = ['profile', 'foods', 'food_names', 'staples', 'logs', 'meta'];

async function tableNames(db: ReturnType<typeof createTestDb>) {
  const rows = await db.getAll<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'");
  return rows.map((r) => r.name);
}

describe('migrate', () => {
  it('creates all tables on a fresh database and sets the version', async () => {
    const db = createTestDb();
    await migrate(db);
    const names = await tableNames(db);
    for (const t of TABLES) expect(names).toContain(t);
    const v = await db.getFirst<{ user_version: number }>('PRAGMA user_version');
    expect(v?.user_version).toBe(MIGRATIONS.length);
  });

  it('is a no-op when run twice', async () => {
    const db = createTestDb();
    await migrate(db);
    await db.run("INSERT INTO meta (key, value) VALUES ('k', 'v')");
    await migrate(db);
    const rows = await db.getAll('SELECT * FROM meta');
    expect(rows).toHaveLength(1);
  });

  it('upgrades an older schema and keeps existing rows', async () => {
    const db = createTestDb();
    const v1 = 'CREATE TABLE things (id INTEGER PRIMARY KEY, name TEXT);';
    const v2 = "ALTER TABLE things ADD COLUMN note TEXT DEFAULT 'none';";
    await migrate(db, [v1]);
    await db.run("INSERT INTO things (name) VALUES ('keep me')");
    await migrate(db, [v1, v2]);
    const row = await db.getFirst<{ name: string; note: string }>('SELECT * FROM things');
    expect(row).toEqual({ id: 1, name: 'keep me', note: 'none' });
    const v = await db.getFirst<{ user_version: number }>('PRAGMA user_version');
    expect(v?.user_version).toBe(2);
  });

  it('rolls back a failed step and keeps the previous version', async () => {
    const db = createTestDb();
    const good = 'CREATE TABLE a (id INTEGER);';
    await migrate(db, [good]);
    await expect(migrate(db, [good, 'CREATE TABLE b (id INTEGER); THIS IS NOT SQL;'])).rejects.toThrow();
    expect(await tableNames(db)).not.toContain('b');
    const v = await db.getFirst<{ user_version: number }>('PRAGMA user_version');
    expect(v?.user_version).toBe(1);
  });

  it('refuses a database that is newer than the app', async () => {
    const db = createTestDb();
    await db.exec('PRAGMA user_version = 5');
    await expect(migrate(db, ['CREATE TABLE a (id INTEGER);'])).rejects.toThrow(/newer/);
  });
});
