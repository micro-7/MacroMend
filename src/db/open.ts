import { openDatabaseAsync } from 'expo-sqlite';
import { wrapExpoDb, type Db } from './db';

export const DATABASE_NAME = 'macromend.db';

export async function openExpoDb(): Promise<Db> {
  const raw = await openDatabaseAsync(DATABASE_NAME);
  await raw.execAsync('PRAGMA journal_mode = WAL;');
  return wrapExpoDb(raw);
}
