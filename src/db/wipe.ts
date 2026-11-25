import type { KeyStore } from '../ai/keyStore';
import type { Db } from './db';
import { BUNDLED_ROWS } from './foods';

/** The id the free USDA key is stored under (kept here so wiping does not import the lookup code). */
const USDA_KEY_ID = 'usda';

export interface WipeDeps {
  keys: KeyStore;
  /** Removes the downloaded phone model, if any. */
  deleteModel: () => Promise<void>;
}

/**
 * Delete everything personal: profile, logs, usual foods, saved and online foods, AI providers and their keys,
 * settings and the phone model. The built-in food table stays, so the app is usable again after onboarding.
 * Keys are removed first (while the provider list still says which exist); if anything fails, the database is
 * left untouched so the user can try again.
 */
export async function wipeAllData(db: Db, deps: WipeDeps): Promise<void> {
  const providers = await db.getAll<{ id: string }>('SELECT id FROM providers');
  for (const { id } of providers) await deps.keys.delete(id);
  await deps.keys.delete(USDA_KEY_ID);
  await deps.deleteModel();

  await db.transaction(async () => {
    await db.run('DELETE FROM logs');
    await db.run('DELETE FROM staples');
    await db.run('DELETE FROM profile');
    await db.run('DELETE FROM providers');
    await db.run('DELETE FROM settings');
    // Everything that is not shipped with the app: own foods, online lookups and AI estimates.
    await db.run(`DELETE FROM food_names WHERE food_id IN (SELECT id FROM foods WHERE NOT (${BUNDLED_ROWS}))`);
    await db.run(`DELETE FROM foods WHERE NOT (${BUNDLED_ROWS})`);
  });
}
