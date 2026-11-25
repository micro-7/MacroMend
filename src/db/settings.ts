import type { Db } from './db';

export async function getSetting(db: Db, key: string): Promise<string | null> {
  const r = await db.getFirst<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return r?.value ?? null;
}

export async function setSetting(db: Db, key: string, value: string): Promise<void> {
  await db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
}

const ONLINE_LOOKUP = 'online_lookup_enabled';

/** Online food lookup is on unless the user switched it off. */
export async function isOnlineLookupEnabled(db: Db): Promise<boolean> {
  return (await getSetting(db, ONLINE_LOOKUP)) !== '0';
}

export async function setOnlineLookupEnabled(db: Db, enabled: boolean): Promise<void> {
  await setSetting(db, ONLINE_LOOKUP, enabled ? '1' : '0');
}
