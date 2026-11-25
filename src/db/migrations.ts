import type { Db } from './db';

/** Ordered schema steps. Index + 1 is the schema version stored in PRAGMA user_version. */
export const MIGRATIONS: string[] = [
  // v1
  `
  CREATE TABLE profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    goal TEXT CHECK (goal IN ('cut','maintain','bulk')),
    diet_type TEXT CHECK (diet_type IN ('veg','eggetarian','non-veg','vegan')),
    weight_kg REAL,
    height_cm REAL,
    age INTEGER,
    sex TEXT CHECK (sex IN ('male','female')),
    activity TEXT,
    kcal_target INTEGER,
    protein_target_g INTEGER,
    slots TEXT NOT NULL DEFAULT '[]',
    onboarded_at TEXT
  );

  CREATE TABLE foods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    aliases TEXT NOT NULL DEFAULT '[]',
    category TEXT NOT NULL CHECK (category IN ('veg','egg','non-veg','vegan')),
    unit TEXT NOT NULL,
    grams_per_unit REAL NOT NULL CHECK (grams_per_unit > 0),
    kcal_per_100g REAL NOT NULL CHECK (kcal_per_100g >= 0),
    protein_per_100g REAL NOT NULL CHECK (protein_per_100g >= 0),
    source TEXT NOT NULL CHECK (source IN ('built-in','usda','openfoodfacts','user','ai-estimated')),
    external_id TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE food_names (
    food_id TEXT NOT NULL,
    name_norm TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('name','alias')),
    PRIMARY KEY (food_id, name_norm)
  );
  CREATE INDEX idx_food_names_norm ON food_names (name_norm);

  CREATE TABLE staples (
    food_id TEXT PRIMARY KEY,
    usual_qty REAL NOT NULL DEFAULT 1,
    usual_unit TEXT
  );

  CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    slot TEXT NOT NULL,
    food_id TEXT NOT NULL,
    qty REAL NOT NULL,
    unit TEXT NOT NULL,
    grams REAL NOT NULL,
    kcal REAL NOT NULL,
    protein_g REAL NOT NULL,
    raw_text TEXT,
    estimated INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_logs_date ON logs (date);

  CREATE TABLE meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
];

/**
 * Upgrade the database to the latest schema. Each step and its version bump
 * run in one transaction, so a failed step leaves the previous version intact.
 * Steps already applied are not run again.
 */
export async function migrate(db: Db, migrations: string[] = MIGRATIONS): Promise<number> {
  const row = await db.getFirst<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current > migrations.length) {
    throw new Error(
      `Database schema v${current} is newer than this app supports (v${migrations.length}).`,
    );
  }
  for (let v = current; v < migrations.length; v++) {
    await db.transaction(async () => {
      await db.exec(migrations[v]);
      await db.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
  return migrations.length;
}
