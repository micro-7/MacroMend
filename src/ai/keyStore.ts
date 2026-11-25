import * as SecureStore from 'expo-secure-store';

/** Where API keys live: the phone's secure storage, never the database and never logs. */
export interface KeyStore {
  get(providerId: string): Promise<string | null>;
  set(providerId: string, key: string): Promise<void>;
  delete(providerId: string): Promise<void>;
}

const name = (id: string) => `provider-key-${id}`;

export const secureKeyStore: KeyStore = {
  get: (id) => SecureStore.getItemAsync(name(id)),
  set: (id, key) => SecureStore.setItemAsync(name(id), key),
  delete: (id) => SecureStore.deleteItemAsync(name(id)),
};

/** In-memory store for tests. */
export function memoryKeyStore(initial: Record<string, string> = {}): KeyStore & { dump(): Record<string, string> } {
  const m = new Map(Object.entries(initial));
  return {
    get: async (id) => m.get(id) ?? null,
    set: async (id, key) => void m.set(id, key),
    delete: async (id) => void m.delete(id),
    dump: () => Object.fromEntries(m),
  };
}

/** Show a key as dots except its last 4 characters, e.g. "••••••••abcd". */
export function maskKey(key: string): string {
  if (key.length <= 4) return '•'.repeat(key.length);
  return `${'•'.repeat(Math.min(12, key.length - 4))}${key.slice(-4)}`;
}
