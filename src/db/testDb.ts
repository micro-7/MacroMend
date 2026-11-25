// Test-only: a Db backed by better-sqlite3. Never import this from app code.
import Database from 'better-sqlite3';
import type { Db, SqlParam } from './db';

export function createTestDb(): Db {
  const d = new Database(':memory:');
  return {
    exec: async (sql) => {
      d.exec(sql);
    },
    run: async (sql, params: SqlParam[] = []) => {
      const r = d.prepare(sql).run(...params);
      return { changes: r.changes, lastInsertRowId: Number(r.lastInsertRowid) };
    },
    getAll: async <T>(sql: string, params: SqlParam[] = []) =>
      d.prepare(sql).all(...params) as T[],
    getFirst: async <T>(sql: string, params: SqlParam[] = []) =>
      ((d.prepare(sql).get(...params) as T | undefined) ?? null),
    transaction: async <T>(fn: () => Promise<T>) => {
      d.exec('BEGIN');
      try {
        const out = await fn();
        d.exec('COMMIT');
        return out;
      } catch (e) {
        d.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
