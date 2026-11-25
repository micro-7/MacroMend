import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { todayKey } from '@/core/day';
import type { Db } from './db';
import { listLogs, type LogEntry } from './logs';

interface DayValue {
  /** Today's local date, YYYY-MM-DD. */
  date: string;
  /** Today's entries, oldest first. */
  logs: LogEntry[];
  /** Re-read today's entries (and the date). Call after any log change. */
  reload: () => Promise<void>;
}

const DayContext = createContext<DayValue | null>(null);

function msUntilNextMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return Math.max(1000, next.getTime() - now.getTime());
}

export function DayProvider({ db, children }: { db: Db; children: ReactNode }) {
  const [state, setState] = useState<{ date: string; logs: LogEntry[] }>({ date: todayKey(), logs: [] });

  const reload = useCallback(async () => {
    const date = todayKey();
    const logs = await listLogs(db, date);
    setState({ date, logs });
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    const date = todayKey();
    listLogs(db, date).then((logs) => {
      if (!cancelled) setState({ date, logs });
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  // Coming back to the app, or crossing midnight while it is open, shows the new day.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') reload();
    });
    return () => sub.remove();
  }, [reload]);

  useEffect(() => {
    const t = setTimeout(reload, msUntilNextMidnight(new Date()));
    return () => clearTimeout(t);
  }, [state.date, reload]);

  return <DayContext.Provider value={{ ...state, reload }}>{children}</DayContext.Provider>;
}

export function useDay(): DayValue {
  const v = useContext(DayContext);
  if (!v) throw new Error('useDay must be used inside <DayProvider>');
  return v;
}
