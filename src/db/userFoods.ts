import type { FoodCategory } from '../core/diet';
import { normalizeName } from '../core/text';
import type { LookupResult } from '../lookup/types';
import type { Db } from './db';
import { getFoodById, SAVED_ID_PREFIX, writeNames, type FoodRow } from './foods';

export type SavedSource = 'usda' | 'openfoodfacts' | 'user' | 'ai-estimated';

export interface NewFood {
  name: string;
  aliases?: string[];
  category: FoodCategory;
  unit: string;
  gramsPerUnit: number;
  kcalPer100g: number;
  proteinPer100g: number;
  source: SavedSource;
  externalId?: string | null;
  /** Optional fixed id (used for foods from online databases, so saving the same one twice finds it again). */
  id?: string;
}

const rand = () => Math.random().toString(36).slice(2, 10);

/** Per-100 g ranges every food must be inside, whoever supplied the numbers. */
export function checkNutrition(kcal: number, protein: number): string | null {
  if (!Number.isFinite(kcal) || !Number.isFinite(protein)) return 'Enter calories and protein as numbers.';
  if (kcal < 0 || kcal > 900) return 'Calories per 100 g must be between 0 and 900.';
  if (protein < 0 || protein > 100) return 'Protein per 100 g must be between 0 and 100 g.';
  // Protein gives 4 kcal per gram, so it cannot supply more energy than the food has (5% slack for rounding).
  if (protein * 4 > kcal * 1.05 + 1) return "That much protein doesn't fit in so few calories. Check both numbers.";
  return null;
}

function idFor(f: NewFood): string {
  if (f.id) return f.id;
  if (f.source === 'ai-estimated') return `ai-${rand()}`;
  return `user-${rand()}`;
}

/** Add a food to the table. The numbers are checked first; nothing is saved if they are impossible. */
export async function createFood(db: Db, f: NewFood, now: Date = new Date()): Promise<FoodRow> {
  const name = f.name.trim();
  if (!name) throw new Error('Give the food a name.');
  if (!(f.gramsPerUnit > 0)) throw new Error('Grams per unit must be above zero.');
  const bad = checkNutrition(f.kcalPer100g, f.proteinPer100g);
  if (bad) throw new Error(bad);

  const id = idFor(f);
  const aliases = [...new Set((f.aliases ?? []).map((a) => a.trim()).filter((a) => a && normalizeName(a) !== normalizeName(name)))];
  await db.transaction(async () => {
    await db.run(
      `INSERT INTO foods (id, name, aliases, category, unit, grams_per_unit, kcal_per_100g, protein_per_100g, source, external_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, JSON.stringify(aliases), f.category, f.unit.trim() || 'g', f.gramsPerUnit, f.kcalPer100g, f.proteinPer100g, f.source, f.externalId ?? null, now.toISOString()],
    );
    await writeNames(db, id, name, aliases);
  });
  return (await getFoodById(db, id))!;
}

const MAX_NAME = 80;

/**
 * Save a food found online. It becomes a normal food with its source, external id and the searched words as an
 * alias, so it is found offline next time. Saving the same online food again reuses it.
 */
export async function saveExternalFood(
  db: Db,
  r: LookupResult,
  opts: { category: FoodCategory; searchedName: string },
  now: Date = new Date(),
): Promise<FoodRow> {
  const id = `${SAVED_ID_PREFIX}${r.externalId.replace(':', '-')}`;
  const existing = await getFoodById(db, id);
  const aliases = [opts.searchedName, r.name];
  if (existing) {
    const merged = [...new Set([...existing.aliases, ...aliases.filter((a) => normalizeName(a) !== normalizeName(existing.name))])];
    await db.transaction(async () => {
      await db.run('UPDATE foods SET aliases = ?, updated_at = ? WHERE id = ?', [JSON.stringify(merged), now.toISOString(), id]);
      await writeNames(db, id, existing.name, merged);
    });
    return (await getFoodById(db, id))!;
  }
  const full = r.brand ? `${r.name} (${r.brand})` : r.name;
  return createFood(
    db,
    {
      id,
      name: full.length > MAX_NAME ? `${full.slice(0, MAX_NAME - 1).trimEnd()}…` : full,
      aliases,
      category: opts.category,
      unit: r.servingGrams ? 'serving' : 'g',
      gramsPerUnit: r.servingGrams ?? 1,
      kcalPer100g: r.kcalPer100g,
      proteinPer100g: r.proteinPer100g,
      source: r.source,
      externalId: r.externalId,
    },
    now,
  );
}

/** Foods the user can edit or delete: everything except the rows that ship with the app. */
export function isEditableFood(f: { id: string; source: string }): boolean {
  return !((f.source === 'built-in' || f.source === 'usda') && !f.id.startsWith(SAVED_ID_PREFIX));
}

interface Raw {
  id: string;
}

export async function listSavedFoods(db: Db): Promise<FoodRow[]> {
  const rows = await db.getAll<Raw>(
    `SELECT id FROM foods WHERE source IN ('user','openfoodfacts','ai-estimated') OR id LIKE '${SAVED_ID_PREFIX}%' ORDER BY name`,
  );
  const foods = await Promise.all(rows.map((r) => getFoodById(db, r.id)));
  return foods.filter((f): f is FoodRow => f !== null);
}

export interface FoodEdit {
  name: string;
  aliases: string[];
  category: FoodCategory;
  unit: string;
  gramsPerUnit: number;
  kcalPer100g: number;
  proteinPer100g: number;
  /** Tick "values checked": an AI estimate then becomes a normal food of yours and is no longer marked "est.". */
  checked?: boolean;
}

/** Change a saved food. Past log entries keep the numbers they were saved with. */
export async function updateFood(db: Db, id: string, edit: FoodEdit, now: Date = new Date()): Promise<FoodRow> {
  const cur = await getFoodById(db, id);
  if (!cur) throw new Error('That food no longer exists.');
  if (!isEditableFood(cur)) throw new Error("Built-in foods can't be edited.");
  const name = edit.name.trim();
  if (!name) throw new Error('Give the food a name.');
  if (!(edit.gramsPerUnit > 0)) throw new Error('Grams per unit must be above zero.');
  const bad = checkNutrition(edit.kcalPer100g, edit.proteinPer100g);
  if (bad) throw new Error(bad);
  const aliases = [...new Set(edit.aliases.map((a) => a.trim()).filter((a) => a && normalizeName(a) !== normalizeName(name)))];
  const source = edit.checked && cur.source === 'ai-estimated' ? 'user' : cur.source;
  await db.transaction(async () => {
    await db.run(
      `UPDATE foods SET name = ?, aliases = ?, category = ?, unit = ?, grams_per_unit = ?, kcal_per_100g = ?, protein_per_100g = ?,
         source = ?, updated_at = ? WHERE id = ?`,
      [name, JSON.stringify(aliases), edit.category, edit.unit.trim() || 'g', edit.gramsPerUnit, edit.kcalPer100g, edit.proteinPer100g, source, now.toISOString(), id],
    );
    await writeNames(db, id, name, aliases);
  });
  return (await getFoodById(db, id))!;
}

export async function deleteFood(db: Db, id: string): Promise<void> {
  const cur = await getFoodById(db, id);
  if (!cur) return;
  if (!isEditableFood(cur)) throw new Error("Built-in foods can't be deleted.");
  await db.transaction(async () => {
    await db.run('DELETE FROM staples WHERE food_id = ?', [id]);
    await db.run('DELETE FROM food_names WHERE food_id = ?', [id]);
    await db.run('DELETE FROM foods WHERE id = ?', [id]);
  });
}
