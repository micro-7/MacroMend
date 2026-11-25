import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ConfirmItem } from './confirm';

/** What the AI understood, waiting for the user to check it on the confirm screen. */
export interface ParseSession {
  /** The text the user typed, kept with each logged entry. */
  text: string;
  /** Which provider (or the phone model) understood it. */
  understoodBy: string;
  items: ConfirmItem[];
}

interface Value {
  session: ParseSession | null;
  start: (s: ParseSession) => void;
  clear: () => void;
}

const Ctx = createContext<Value | null>(null);

export function ParseSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ParseSession | null>(null);
  const start = useCallback((s: ParseSession) => setSession(s), []);
  const clear = useCallback(() => setSession(null), []);
  const value = useMemo(() => ({ session, start, clear }), [session, start, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useParseSession(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error('useParseSession must be used inside <ParseSessionProvider>');
  return v;
}
