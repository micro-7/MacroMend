import { nutrition, toGrams, validateQty } from '../core/portions';
import type { Db } from './db';
import { getFoodById } from './foods';

export interface LogEntry {
  id: number;
  date: string;
  slot: string;
  foodId: string;
  foodName: string;
  qty: number;
  unit: string;
  grams: number;
  kcal: number;
  proteinG: number;
  rawText: string | null;
  estimated: boolean;
  createdAt: string;
}

export interface NewLog {
  /** Local date, YYYY-MM-DD. */
  date: string;
  slot: string;
  foodId: string;
  qty: number;
  unit: string;
  rawText?: string | null;
  estimated?: boolean;
}

interface LogRow {
  id: number;
  date: string;
  slot: string;
  food_id: string;
  food_name: string | null;
  qty: number;
  unit: string;
  grams: number;
  kcal: number;
  protein_g: number;
  raw_text: string | null;
  estimated: number;
  created_at: string;
}

const SELECT = `SELECT l.*, f.name AS food_name FROM logs l LEFT JOIN foods f ON f.id = l.food_id`;

function toEntry(r: LogRow): LogEntry {
  return {
    id: r.id,
    date: r.date,
    slot: r.slot,
    foodId: r.food_id,
    foodName: r.food_name ?? 'Removed food',
    qty: r.qty,
    unit: r.unit,
    grams: r.grams,
    kcal: r.kcal,
    proteinG: r.protein_g,
    rawText: r.raw_text,
    estimated: r.estimated === 1,
    createdAt: r.created_at,
  };
}

async function compute(db: Db, foodId: string, qty: number, unit: string) {
  const food = await getFoodById(db, foodId);
  if (!food) throw new Error('That food is no longer in the food table.');
  const error = validateQty(qty, unit);
  if (error) throw new Error(error);
  const grams = toGrams(food, qty, unit);
  return { grams, ...nutrition(food, grams) };
}

/**
 * The one way to add a food to the log. Grams, kcal and protein are worked out from the food table
 * now and stored, so later changes to a food never alter past entries.
 */
export async function logFood(db: Db, input: NewLog, now: Date = new Date()): Promise<LogEntry> {
  const n = await compute(db, input.foodId, input.qty, input.unit);
  const r = await db.run(
    `INSERT INTO logs (date, slot, food_id, qty, unit, grams, kcal, protein_g, raw_text, estimated, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [input.date, input.slot, input.foodId, input.qty, input.unit, n.grams, n.kcal, n.proteinG, input.rawText ?? null, input.estimated ? 1 : 0, now.toISOString()],
  );
  const entry = await getLog(db, r.lastInsertRowId);
  if (!entry) throw new Error('Could not read back the saved entry.');
  return entry;
}

export async function getLog(db: Db, id: number): Promise<LogEntry | null> {
  const r = await db.getFirst<LogRow>(`${SELECT} WHERE l.id = ?`, [id]);
  return r ? toEntry(r) : null;
}

/** Entries for one local date, oldest first. */
export async function listLogs(db: Db, date: string): Promise<LogEntry[]> {
  const rows = await db.getAll<LogRow>(`${SELECT} WHERE l.date = ? ORDER BY l.id`, [date]);
  return rows.map(toEntry);
}

/** Change an entry's quantity, unit or slot. Numbers are recalculated from the food as it is now. */
export async function updateLog(db: Db, id: number, change: { qty: number; unit: string; slot: string }): Promise<LogEntry> {
  const existing = await getLog(db, id);
  if (!existing) throw new Error('That entry no longer exists.');
  const n = await compute(db, existing.foodId, change.qty, change.unit);
  await db.run('UPDATE logs SET slot = ?, qty = ?, unit = ?, grams = ?, kcal = ?, protein_g = ? WHERE id = ?', [
    change.slot, change.qty, change.unit, n.grams, n.kcal, n.proteinG, id,
  ]);
  return (await getLog(db, id))!;
}

export async function deleteLog(db: Db, id: number): Promise<void> {
  await db.run('DELETE FROM logs WHERE id = ?', [id]);
}
