import { DEFAULT_SLOTS } from '../../core/slots';
import { seedCatalog } from '../foods';
import { migrate } from '../migrations';
import { MAX_NAME_LENGTH, completeOnboarding, getProfile, needsOnboarding, normalizeDisplayName, saveProfile, type Profile } from '../profile';
import { MIGRATIONS } from '../migrations';
import { memoryKeyStore } from '../../ai/keyStore';
import { wipeAllData } from '../wipe';
import { listStaples } from '../staples';
import { createTestDb } from '../testDb';

async function freshDb() {
  const db = createTestDb();
  await migrate(db);
  await seedCatalog(db);
  return db;
}

const base: Omit<Profile, 'onboardedAt'> = {
  goal: 'cut',
  dietType: 'veg',
  weightKg: 75,
  heightCm: 175,
  age: 30,
  sex: 'male',
  activity: 'moderate',
  kcalTarget: 2110,
  proteinTargetG: 150,
  slots: DEFAULT_SLOTS,
};

describe('profile storage', () => {
  it('has no profile before onboarding, so onboarding is needed', async () => {
    const db = await freshDb();
    const p = await getProfile(db);
    expect(p).toBeNull();
    expect(needsOnboarding(p)).toBe(true);
  });

  it('needs onboarding while onboardedAt is null, and not after', () => {
    expect(needsOnboarding({ ...base, onboardedAt: null })).toBe(true);
    expect(needsOnboarding({ ...base, onboardedAt: '2026-11-25T10:00:00.000Z' })).toBe(false);
  });

  it('round-trips a completed profile together with its staples', async () => {
    const db = await freshDb();
    await completeOnboarding(
      db,
      base,
      [
        { foodId: 'in-paneer', usualQty: 100, usualUnit: 'g' },
        { foodId: 'in-roti', usualQty: 3, usualUnit: 'piece' },
      ],
      new Date('2026-11-25T10:00:00.000Z'),
    );
    const p = await getProfile(db);
    expect(p).toEqual({ ...base, name: null, onboardedAt: '2026-11-25T10:00:00.000Z' });
    expect(needsOnboarding(p)).toBe(false);
    const staples = await listStaples(db);
    expect(staples.map((s) => [s.foodId, s.usualQty, s.usualUnit])).toEqual([
      ['in-paneer', 100, 'g'],
      ['in-roti', 3, 'piece'],
    ]);
  });

  it('saves nothing if onboarding fails part-way', async () => {
    const db = await freshDb();
    // The second staple breaks the NOT NULL rule on usual_qty, after the profile row was already written.
    const bad = [
      { foodId: 'in-roti', usualQty: 1, usualUnit: 'piece' },
      { foodId: 'in-dal', usualQty: null as unknown as number, usualUnit: 'katori' },
    ];
    await expect(completeOnboarding(db, base, bad)).rejects.toThrow(/NOT NULL/i);
    expect(await getProfile(db)).toBeNull();
    expect(await listStaples(db)).toEqual([]);
  });

  it('keeps null body details when targets were typed', async () => {
    const db = await freshDb();
    await completeOnboarding(db, { ...base, weightKg: null, heightCm: null, age: null, sex: null, activity: null }, []);
    const p = await getProfile(db);
    expect(p?.weightKg).toBeNull();
    expect(p?.sex).toBeNull();
  });

  it('updates the profile in place without re-running onboarding', async () => {
    const db = await freshDb();
    await completeOnboarding(db, base, [], new Date('2026-11-25T10:00:00.000Z'));
    const p = (await getProfile(db))!;
    await saveProfile(db, { ...p, dietType: 'non-veg', weightKg: 72 });
    const after = await getProfile(db);
    expect(after?.dietType).toBe('non-veg');
    expect(after?.weightKg).toBe(72);
    expect(after?.onboardedAt).toBe('2026-11-25T10:00:00.000Z');
  });
});

describe('display name', () => {
  it('trims, turns blank into no name, and cuts at the length limit', () => {
    expect(normalizeDisplayName('  Mihir  ')).toBe('Mihir');
    expect(normalizeDisplayName('   ')).toBeNull();
    expect(normalizeDisplayName('')).toBeNull();
    expect(normalizeDisplayName(null)).toBeNull();
    expect(normalizeDisplayName('*Mi*hir*')).toBe('Mihir');
    expect(normalizeDisplayName('x'.repeat(50))).toBe('x'.repeat(MAX_NAME_LENGTH));
  });

  it('is saved with the profile and can be changed or cleared later', async () => {
    const db = await freshDb();
    await completeOnboarding(db, { ...base, name: ' Mihir ' }, [], new Date('2026-11-25T10:00:00.000Z'));
    expect((await getProfile(db))?.name).toBe('Mihir');
    await saveProfile(db, { ...(await getProfile(db))!, name: 'Mihir T' });
    expect((await getProfile(db))?.name).toBe('Mihir T');
    await saveProfile(db, { ...(await getProfile(db))!, name: '   ' });
    expect((await getProfile(db))?.name).toBeNull();
  });

  it('upgrades a v3 database and keeps the profile, with no name', async () => {
    const db = createTestDb();
    await migrate(db, MIGRATIONS.slice(0, 3));
    await db.run(
      "INSERT INTO profile (id, goal, diet_type, kcal_target, protein_target_g, slots, onboarded_at) VALUES (1, 'cut', 'veg', 1800, 120, ?, '2026-11-25T10:00:00.000Z')",
      [JSON.stringify(DEFAULT_SLOTS)],
    );
    await migrate(db);
    const p = await getProfile(db);
    expect(p).toMatchObject({ kcalTarget: 1800, goal: 'cut', name: null });
    expect((await db.getFirst<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(MIGRATIONS.length);
  });

  it('is removed with everything else by "Delete all my data"', async () => {
    const db = await freshDb();
    await completeOnboarding(db, { ...base, name: 'Mihir' }, []);
    await wipeAllData(db, { keys: memoryKeyStore(), deleteModel: async () => {} });
    expect(await getProfile(db)).toBeNull();
  });
});
