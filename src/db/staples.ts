import type { FoodCategory } from '../core/diet';
import type { StapleInfo } from '../core/rebalance';
import { normalizeName } from '../core/text';
import type { Db } from './db';
import { toFoodRow, type FoodRow, type RawFoodRow } from './foods';

export interface StapleInput {
  foodId: string;
  usualQty: number;
  usualUnit: string | null;
}

export interface Staple extends StapleInput {
  food: FoodRow;
}

/** Replace all staples. No transaction of its own, so it can run inside another one. */
export async function writeStaples(db: Db, items: StapleInput[]): Promise<void> {
  await db.run('DELETE FROM staples');
  for (const s of items) {
    await db.run('INSERT INTO staples (food_id, usual_qty, usual_unit) VALUES (?, ?, ?)', [
      s.foodId,
      s.usualQty,
      s.usualUnit,
    ]);
  }
}

export async function setStaples(db: Db, items: StapleInput[]): Promise<void> {
  await db.transaction(() => writeStaples(db, items));
}

export async function listStaples(db: Db): Promise<Staple[]> {
  const rows = await db.getAll<RawFoodRow & { usual_qty: number; usual_unit: string | null }>(
    `SELECT f.*, s.usual_qty, s.usual_unit FROM staples s JOIN foods f ON f.id = s.food_id ORDER BY f.name`,
  );
  return rows.map((r) => ({
    foodId: r.id,
    usualQty: r.usual_qty,
    usualUnit: r.usual_unit,
    food: toFoodRow(r),
  }));
}

export async function updateUsualQty(db: Db, foodId: string, usualQty: number): Promise<void> {
  await db.run('UPDATE staples SET usual_qty = ? WHERE food_id = ?', [usualQty, foodId]);
}

export interface SearchOptions {
  /** Only foods in these categories; omit to search every food. */
  categories?: FoodCategory[];
  limit?: number;
}

/**
 * Find foods whose name or any alias contains the query (case and spacing ignored).
 * Foods whose name or alias starts with the query come first. An empty query lists foods by name.
 */
export async function searchFoods(db: Db, query: string, opts: SearchOptions = {}): Promise<FoodRow[]> {
  const q = normalizeName(query);
  const limit = opts.limit ?? 60;
  const params: (string | number)[] = [];
  const where: string[] = [];

  if (q) {
    where.push('f.id IN (SELECT food_id FROM food_names WHERE name_norm LIKE ?)');
    params.push(`%${q}%`);
  }
  if (opts.categories) {
    if (opts.categories.length === 0) return [];
    where.push(`f.category IN (${opts.categories.map(() => '?').join(',')})`);
    params.push(...opts.categories);
  }

  const orderParams: (string | number)[] = [];
  let order = 'f.name';
  if (q) {
    order = 'CASE WHEN f.id IN (SELECT food_id FROM food_names WHERE name_norm LIKE ?) THEN 0 ELSE 1 END, f.name';
    orderParams.push(`${q}%`);
  }

  const sql = `SELECT f.* FROM foods f ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order} LIMIT ?`;
  const rows = await db.getAll<RawFoodRow>(sql, [...params, ...orderParams, limit]);
  return rows.map(toFoodRow);
}

/** The facts the suggestion engine needs about a staple. */
export function toStapleInfo(s: Staple): StapleInfo {
  return {
    foodId: s.food.id,
    name: s.food.name,
    category: s.food.category,
    unit: s.food.unit,
    gramsPerUnit: s.food.gramsPerUnit,
    kcalPer100g: s.food.kcalPer100g,
    proteinPer100g: s.food.proteinPer100g,
    usualQty: s.usualQty,
  };
}
