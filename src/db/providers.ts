import type { Db } from './db';

export type ProviderKind = 'gemini' | 'groq' | 'openrouter' | 'custom';
export type SkipReason = 'rate_limit' | 'quota' | 'auth';

export interface ProviderRow {
  id: string;
  kind: ProviderKind;
  label: string;
  baseUrl: string;
  model: string;
  position: number;
  enabled: boolean;
  /** ISO time until which the provider is skipped, or null. */
  skipUntil: string | null;
  skipReason: SkipReason | null;
  lastError: string | null;
}

interface Raw {
  id: string;
  kind: ProviderKind;
  label: string;
  base_url: string;
  model: string;
  position: number;
  enabled: number;
  skip_until: string | null;
  skip_reason: SkipReason | null;
  last_error: string | null;
}

/** A skip with no end, cleared only when the user edits the provider (a rejected key). */
export const SKIP_FOREVER = '9999-12-31T00:00:00.000Z';

const toRow = (r: Raw): ProviderRow => ({
  id: r.id, kind: r.kind, label: r.label, baseUrl: r.base_url, model: r.model, position: r.position,
  enabled: r.enabled === 1, skipUntil: r.skip_until, skipReason: r.skip_reason, lastError: r.last_error,
});

export async function listProviders(db: Db): Promise<ProviderRow[]> {
  return (await db.getAll<Raw>('SELECT * FROM providers ORDER BY position, id')).map(toRow);
}

export async function getProvider(db: Db, id: string): Promise<ProviderRow | null> {
  const r = await db.getFirst<Raw>('SELECT * FROM providers WHERE id = ?', [id]);
  return r ? toRow(r) : null;
}

export interface NewProvider {
  kind: ProviderKind;
  label: string;
  baseUrl: string;
  model: string;
}

export async function addProvider(db: Db, p: NewProvider, makeId: () => string = () => Math.random().toString(36).slice(2, 10)): Promise<ProviderRow> {
  const id = `${p.kind}-${makeId()}`;
  const last = await db.getFirst<{ m: number | null }>('SELECT MAX(position) AS m FROM providers');
  await db.run(
    'INSERT INTO providers (id, kind, label, base_url, model, position, enabled) VALUES (?, ?, ?, ?, ?, ?, 1)',
    [id, p.kind, p.label.trim(), p.baseUrl.trim(), p.model.trim(), (last?.m ?? -1) + 1],
  );
  return (await getProvider(db, id))!;
}

/** Change a provider's label, address, model or on/off switch. Changing address or model clears any skip. */
export async function updateProvider(
  db: Db,
  id: string,
  patch: Partial<Pick<ProviderRow, 'label' | 'baseUrl' | 'model' | 'enabled'>>,
): Promise<void> {
  const cur = await getProvider(db, id);
  if (!cur) throw new Error('That provider no longer exists.');
  const next = { ...cur, ...patch };
  const changedTarget = next.baseUrl !== cur.baseUrl || next.model !== cur.model;
  await db.run(
    `UPDATE providers SET label = ?, base_url = ?, model = ?, enabled = ?,
       skip_until = CASE WHEN ? THEN NULL ELSE skip_until END,
       skip_reason = CASE WHEN ? THEN NULL ELSE skip_reason END
     WHERE id = ?`,
    [next.label.trim(), next.baseUrl.trim(), next.model.trim(), next.enabled ? 1 : 0, changedTarget ? 1 : 0, changedTarget ? 1 : 0, id],
  );
}

export async function deleteProvider(db: Db, id: string): Promise<void> {
  await db.transaction(async () => {
    await db.run('DELETE FROM providers WHERE id = ?', [id]);
    const rest = await db.getAll<{ id: string }>('SELECT id FROM providers ORDER BY position, id');
    for (let i = 0; i < rest.length; i++) await db.run('UPDATE providers SET position = ? WHERE id = ?', [i, rest[i].id]);
  });
}

/** Move a provider one place up (-1) or down (+1) in the order they are tried. */
export async function moveProvider(db: Db, id: string, delta: -1 | 1): Promise<void> {
  const all = await listProviders(db);
  const from = all.findIndex((p) => p.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= all.length) return;
  const ids = all.map((p) => p.id);
  [ids[from], ids[to]] = [ids[to], ids[from]];
  await db.transaction(async () => {
    for (let i = 0; i < ids.length; i++) await db.run('UPDATE providers SET position = ? WHERE id = ?', [i, ids[i]]);
  });
}

export async function setSkip(db: Db, id: string, until: Date | 'forever', reason: SkipReason, lastError?: string): Promise<void> {
  await db.run('UPDATE providers SET skip_until = ?, skip_reason = ?, last_error = COALESCE(?, last_error) WHERE id = ?', [
    until === 'forever' ? SKIP_FOREVER : until.toISOString(), reason, lastError ?? null, id,
  ]);
}

export async function clearSkip(db: Db, id: string): Promise<void> {
  await db.run('UPDATE providers SET skip_until = NULL, skip_reason = NULL WHERE id = ?', [id]);
}

export async function recordError(db: Db, id: string, message: string | null): Promise<void> {
  await db.run('UPDATE providers SET last_error = ? WHERE id = ?', [message, id]);
}

export type ProviderStatus = 'ok' | 'disabled' | 'rate_limited' | 'out_of_quota' | 'key_rejected';

/** What Settings shows for a provider right now. */
export function providerStatus(p: ProviderRow, now: Date = new Date()): ProviderStatus {
  if (!p.enabled) return 'disabled';
  if (p.skipUntil && new Date(p.skipUntil) > now) {
    if (p.skipReason === 'auth') return 'key_rejected';
    if (p.skipReason === 'quota') return 'out_of_quota';
    return 'rate_limited';
  }
  return 'ok';
}

export function isSkipped(p: ProviderRow, now: Date = new Date()): boolean {
  return !!p.skipUntil && new Date(p.skipUntil) > now;
}
