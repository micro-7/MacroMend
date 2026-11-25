import { useCallback, useEffect, useState } from 'react';
import type { Db } from './db';
import { initDatabase } from './init';
import { openExpoDb } from './open';

export type AppDatabaseState =
  | { status: 'loading' }
  | { status: 'ready'; db: Db }
  | { status: 'error'; message: string };

/** Opens, migrates and seeds the database once; `retry` runs the whole startup again. */
export function useAppDatabase(): { state: AppDatabaseState; retry: () => void } {
  const [state, setState] = useState<AppDatabaseState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    initDatabase(openExpoDb).then(
      (db) => {
        if (!cancelled) setState({ status: 'ready', db });
      },
      (e: unknown) => {
        if (!cancelled) setState({ status: 'error', message: e instanceof Error ? e.message : String(e) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
