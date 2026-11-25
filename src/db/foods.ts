import { normalizeName } from '../core/text';
import { ALL_FOODS, CATALOG_VERSION } from '../data/foods';
import type { FoodSeed } from '../data/foods';
import type { Db } from './db';

export interface FoodRow {
  id: string;
  name: string;
  aliases: string[];
  category: 'veg' | 'egg' | 'non-veg' | 'vegan';
  unit: string;
  gramsPerUnit: number;
  kcalPer100g: number;
  proteinPer100g: number;
  source: 'built-in' | 'usda' | 'openfoodfacts' | 'user' | 'ai-estimated';
  externalId: string | null;
}

export interface RawFoodRow {
  id: string;
  name: string;
  aliases: string;
  category: FoodRow['category'];
  unit: string;
  grams_per_unit: number;
  kcal_per_100g: number;
  protein_per_100g: number;
  source: FoodRow['source'];
  external_id: string | null;
}

const BUNDLED_SOURCES = "('built-in','usda')";

export function toFoodRow(r: RawFoodRow): FoodRow {
  return {
    id: r.id,
    name: r.name,
    aliases: JSON.parse(r.aliases) as string[],
    category: r.category,
    unit: r.unit,
    gramsPerUnit: r.grams_per_unit,
    kcalPer100g: r.kcal_per_100g,
    proteinPer100g: r.protein_per_100g,
    source: r.source,
    externalId: r.external_id,
  };
}

async function writeNames(db: Db, id: string, name: string, aliases: string[]): Promise<void> {
  await db.run('DELETE FROM food_names WHERE food_id = ?', [id]);
  const seen = new Set<string>();
  const add = async (raw: string, kind: 'name' | 'alias') => {
    const norm = normalizeName(raw);
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    await db.run('INSERT INTO food_names (food_id, name_norm, kind) VALUES (?, ?, ?)', [id, norm, kind]);
  };
  await add(name, 'name');
  for (const a of aliases) await add(a, 'alias');
}

/**
 * Load the bundled food table. Runs only when the stored catalog version is
 * older than the app's. Updates built-in and usda rows, removes bundled rows
 * that no longer ship, and never touches user, openfoodfacts or ai-estimated foods.
 */
export async function seedCatalog(
  db: Db,
  foods: FoodSeed[] = ALL_FOODS,
  version: number = CATALOG_VERSION,
): Promise<boolean> {
  const stored = await db.getFirst<{ value: string }>("SELECT value FROM meta WHERE key = 'catalog_version'");
  if (stored && Number(stored.value) >= version) return false;

  const now = new Date().toISOString();
  await db.transaction(async () => {
    for (const f of foods) {
      await db.run(
        `INSERT INTO foods (id, name, aliases, category, unit, grams_per_unit, kcal_per_100g, protein_per_100g, source, external_id, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, aliases = excluded.aliases, category = excluded.category,
           unit = excluded.unit, grams_per_unit = excluded.grams_per_unit,
           kcal_per_100g = excluded.kcal_per_100g, protein_per_100g = excluded.protein_per_100g,
           source = excluded.source, external_id = excluded.external_id, updated_at = excluded.updated_at
         WHERE foods.source IN ${BUNDLED_SOURCES}`,
        [f.id, f.name, JSON.stringify(f.aliases), f.category, f.unit, f.gramsPerUnit, f.kcalPer100g, f.proteinPer100g, f.source, f.externalId ?? null, now],
      );
      await writeNames(db, f.id, f.name, f.aliases);
    }
    const keep = new Set(foods.map((f) => f.id));
    const bundled = await db.getAll<{ id: string }>(`SELECT id FROM foods WHERE source IN ${BUNDLED_SOURCES}`);
    for (const { id } of bundled) {
      if (keep.has(id)) continue;
      await db.run('DELETE FROM foods WHERE id = ?', [id]);
      await db.run('DELETE FROM food_names WHERE food_id = ?', [id]);
      await db.run('DELETE FROM staples WHERE food_id = ?', [id]);
    }
    await db.run(
      "INSERT INTO meta (key, value) VALUES ('catalog_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [String(version)],
    );
  });
  return true;
}

export async function countFoods(db: Db): Promise<number> {
  const row = await db.getFirst<{ n: number }>('SELECT COUNT(*) AS n FROM foods');
  return row?.n ?? 0;
}

export async function getFoodById(db: Db, id: string): Promise<FoodRow | null> {
  const row = await db.getFirst<RawFoodRow>('SELECT * FROM foods WHERE id = ?', [id]);
  return row ? toFoodRow(row) : null;
}

/** Exact lookup by name or alias, ignoring case and spacing. Names win over aliases. */
export async function findFoodByExactName(db: Db, input: string): Promise<FoodRow | null> {
  const norm = normalizeName(input);
  if (!norm) return null;
  const row = await db.getFirst<RawFoodRow>(
    `SELECT f.* FROM food_names n JOIN foods f ON f.id = n.food_id
     WHERE n.name_norm = ?
     ORDER BY CASE n.kind WHEN 'name' THEN 0 ELSE 1 END, f.id
     LIMIT 1`,
    [norm],
  );
  return row ? toFoodRow(row) : null;
}

/** Load several foods at once, keeping the order of `ids` and skipping ids that do not exist. */
export async function getFoodsByIds(db: Db, ids: string[]): Promise<FoodRow[]> {
  if (ids.length === 0) return [];
  const rows = await db.getAll<RawFoodRow>(
    `SELECT * FROM foods WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids,
  );
  const byId = new Map(rows.map((r) => [r.id, toFoodRow(r)]));
  return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}
