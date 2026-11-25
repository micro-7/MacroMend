import { MIGRATIONS, migrate } from '../migrations';
import { seedCatalog } from '../foods';
import {
  SKIP_FOREVER, addProvider, clearSkip, deleteProvider, getProvider, isSkipped, listProviders, moveProvider,
  providerStatus, setSkip, updateProvider, type NewProvider,
} from '../providers';
import { completeOnboarding, getProfile } from '../profile';
import { DEFAULT_SLOTS } from '../../core/slots';
import { createTestDb } from '../testDb';

const groq: NewProvider = { kind: 'groq', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'openai/gpt-oss-20b' };
const gemini: NewProvider = { kind: 'gemini', label: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.5-flash-lite' };
const NOW = new Date('2026-11-25T10:00:00.000Z');

async function freshDb() {
  const db = createTestDb();
  await migrate(db);
  return db;
}

describe('migration v2', () => {
  it('upgrades a v1 database and keeps its rows', async () => {
    const db = createTestDb();
    await migrate(db, MIGRATIONS.slice(0, 1));
    await seedCatalog(db);
    // Written with plain SQL: this is a v1 database, which has no name column yet.
    await db.run(
      "INSERT INTO profile (id, goal, diet_type, kcal_target, protein_target_g, slots, onboarded_at) VALUES (1, 'cut', 'veg', 1800, 120, ?, '2026-11-25T10:00:00.000Z')",
      [JSON.stringify(DEFAULT_SLOTS)],
    );
    await db.run("INSERT INTO staples (food_id, usual_qty, usual_unit) VALUES ('in-roti', 2, 'piece')");
    await db.run("INSERT INTO logs (date, slot, food_id, qty, unit, grams, kcal, protein_g, estimated, created_at) VALUES ('2026-11-25','lunch','in-roti',2,'piece',80,238,7.8,0,'x')");
    await migrate(db);
    expect((await getProfile(db))?.kcalTarget).toBe(1800);
    expect(await db.getAll('SELECT * FROM logs')).toHaveLength(1);
    expect(await db.getAll('SELECT * FROM staples')).toHaveLength(1);
    expect(await listProviders(db)).toEqual([]);
    const v = await db.getFirst<{ user_version: number }>('PRAGMA user_version');
    expect(v?.user_version).toBe(MIGRATIONS.length);
  });
});

describe('providers', () => {
  it('adds providers in order and lists them', async () => {
    const db = await freshDb();
    const a = await addProvider(db, groq);
    const b = await addProvider(db, gemini);
    expect([a.position, b.position]).toEqual([0, 1]);
    expect((await listProviders(db)).map((p) => p.label)).toEqual(['Groq', 'Gemini']);
    expect(a).toMatchObject({ kind: 'groq', enabled: true, skipUntil: null, model: 'openai/gpt-oss-20b' });
  });

  it('reorders by moving one place, and ignores moves past the ends', async () => {
    const db = await freshDb();
    await addProvider(db, groq);
    const b = await addProvider(db, gemini);
    await moveProvider(db, b.id, -1);
    expect((await listProviders(db)).map((p) => p.label)).toEqual(['Gemini', 'Groq']);
    await moveProvider(db, b.id, -1);
    expect((await listProviders(db)).map((p) => p.label)).toEqual(['Gemini', 'Groq']);
  });

  it('enables, disables and edits the model', async () => {
    const db = await freshDb();
    const a = await addProvider(db, groq);
    await updateProvider(db, a.id, { enabled: false });
    expect((await getProvider(db, a.id))?.enabled).toBe(false);
    await updateProvider(db, a.id, { model: ' openai/gpt-oss-120b ' });
    expect((await getProvider(db, a.id))?.model).toBe('openai/gpt-oss-120b');
    await expect(updateProvider(db, 'nope', { enabled: true })).rejects.toThrow(/no longer exists/);
  });

  it('deletes a provider and closes the gap in the order', async () => {
    const db = await freshDb();
    const a = await addProvider(db, groq);
    await addProvider(db, gemini);
    await addProvider(db, { ...groq, label: 'Groq 2' });
    await deleteProvider(db, a.id);
    expect((await listProviders(db)).map((p) => [p.label, p.position])).toEqual([['Gemini', 0], ['Groq 2', 1]]);
  });
});

describe('skip states and status', () => {
  it('reports ok, rate limited, out of quota and key rejected', async () => {
    const db = await freshDb();
    const a = await addProvider(db, groq);
    const later = new Date(NOW.getTime() + 3600_000);
    expect(providerStatus((await getProvider(db, a.id))!, NOW)).toBe('ok');
    await setSkip(db, a.id, later, 'rate_limit');
    expect(providerStatus((await getProvider(db, a.id))!, NOW)).toBe('rate_limited');
    await setSkip(db, a.id, later, 'quota');
    expect(providerStatus((await getProvider(db, a.id))!, NOW)).toBe('out_of_quota');
    await setSkip(db, a.id, 'forever', 'auth', 'key rejected');
    const p = (await getProvider(db, a.id))!;
    expect(p.skipUntil).toBe(SKIP_FOREVER);
    expect(providerStatus(p, NOW)).toBe('key_rejected');
    expect(p.lastError).toBe('key rejected');
  });

  it('stops skipping once the time has passed, and treats disabled as disabled', async () => {
    const db = await freshDb();
    const a = await addProvider(db, groq);
    await setSkip(db, a.id, new Date(NOW.getTime() - 1000), 'rate_limit');
    const p = (await getProvider(db, a.id))!;
    expect(isSkipped(p, NOW)).toBe(false);
    expect(providerStatus(p, NOW)).toBe('ok');
    await updateProvider(db, a.id, { enabled: false });
    expect(providerStatus((await getProvider(db, a.id))!, NOW)).toBe('disabled');
  });

  it('survives a restart (it is stored) and can be cleared', async () => {
    const db = await freshDb();
    const a = await addProvider(db, groq);
    await setSkip(db, a.id, 'forever', 'auth');
    expect(isSkipped((await listProviders(db))[0], NOW)).toBe(true);
    await clearSkip(db, a.id);
    expect(isSkipped((await listProviders(db))[0], NOW)).toBe(false);
  });

  it('clears a skip when the model or address is edited, but not for a label change', async () => {
    const db = await freshDb();
    const a = await addProvider(db, groq);
    await setSkip(db, a.id, 'forever', 'auth');
    await updateProvider(db, a.id, { label: 'My Groq' });
    expect(isSkipped((await getProvider(db, a.id))!, NOW)).toBe(true);
    await updateProvider(db, a.id, { model: 'other-model' });
    expect(isSkipped((await getProvider(db, a.id))!, NOW)).toBe(false);
  });
});
