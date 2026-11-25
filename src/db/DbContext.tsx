import { createContext, useContext } from 'react';
import type { Db } from './db';

const DbContext = createContext<Db | null>(null);

export const DbProvider = DbContext.Provider;

export function useDb(): Db {
  const db = useContext(DbContext);
  if (!db) throw new Error('useDb must be used inside <DbProvider>');
  return db;
}
