import type { Db } from './db';
import { seedCatalog } from './foods';
import { migrate } from './migrations';

/**
 * Open the database, upgrade its schema and load the food table.
 * Rejects (instead of continuing with empty data) if any step fails.
 */
export async function initDatabase(open: () => Promise<Db>): Promise<Db> {
  const db = await open();
  await migrate(db);
  await seedCatalog(db);
  return db;
}
