import type { SQLiteDatabase } from 'expo-sqlite';

export type SqlParam = string | number | null;

export interface RunResult {
  changes: number;
  lastInsertRowId: number;
}

/**
 * Minimal async database interface. The app implements it with expo-sqlite;
 * unit tests implement it with better-sqlite3 so SQL runs against real SQLite.
 * Transactions must not be nested.
 */
export interface Db {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParam[]): Promise<RunResult>;
  getAll<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T[]>;
  getFirst<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T | null>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

export function wrapExpoDb(raw: SQLiteDatabase): Db {
  return {
    exec: (sql) => raw.execAsync(sql),
    run: async (sql, params = []) => {
      const r = await raw.runAsync(sql, params);
      return { changes: r.changes, lastInsertRowId: r.lastInsertRowId };
    },
    getAll: <T>(sql: string, params: SqlParam[] = []) => raw.getAllAsync<T>(sql, params),
    getFirst: async <T>(sql: string, params: SqlParam[] = []) =>
      (await raw.getFirstAsync<T>(sql, params)) ?? null,
    transaction: async <T>(fn: () => Promise<T>) => {
      let result!: T;
      await raw.withTransactionAsync(async () => {
        result = await fn();
      });
      return result;
    },
  };
}
