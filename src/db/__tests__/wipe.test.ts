import { memoryKeyStore } from '../../ai/keyStore';
import { DEFAULT_SLOTS } from '../../core/slots';
import { countFoods, seedCatalog } from '../foods';
import { listLogs, logFood } from '../logs';
import { migrate } from '../migrations';
import { completeOnboarding, getProfile, needsOnboarding, type Profile } from '../profile';
import { addProvider } from '../providers';
import { setSetting, getSetting } from '../settings';
import { listStaples } from '../staples';
import { createTestDb } from '../testDb';
import { createFood } from '../userFoods';
import { wipeAllData } from '../wipe';

const profile: Profile = {
  goal: 'maintain', dietType: 'non-veg', weightKg: 70, heightCm: 170, age: 30, sex: 'male', activity: 'light',
  kcalTarget: 2200, proteinTargetG: 120, slots: DEFAULT_SLOTS, onboardedAt: '2026-11-25T00:00:00.000Z',
};

async function seeded() {
  const db = createTestDb();
  await migrate(db);
  await seedCatalog(db);
  const builtIn = await countFoods(db);
  await completeOnboarding(db, profile, [{ foodId: 'in-roti', usualQty: 2, usualUnit: 'piece' }]);
  await logFood(db, { date: '2026-11-25', slot: 'lunch', foodId: 'in-roti', qty: 2, unit: 'piece' });
  await createFood(db, { name: 'Mom special', aliases: ['mom sabzi'], category: 'veg', unit: 'g', gramsPerUnit: 1, kcalPer100g: 100, proteinPer100g: 3, source: 'user' });
  const p = await addProvider(db, { kind: 'groq', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'm' });
  await setSetting(db, 'phone_only', '1');
  const keys = memoryKeyStore({ [p.id]: 'secret', usda: 'usda-secret', other: 'keep' });
  return { db, builtIn, keys };
}

describe('wipeAllData', () => {
  it('removes personal data, keys and the model, keeps built-in foods, and requires onboarding again', async () => {
    const { db, builtIn, keys } = await seeded();
    let modelDeleted = 0;
    await wipeAllData(db, { keys, deleteModel: async () => void modelDeleted++ });
    expect(modelDeleted).toBe(1);
    expect(keys.dump()).toEqual({ other: 'keep' });
    expect(needsOnboarding(await getProfile(db))).toBe(true);
    expect(await listLogs(db, '2026-11-25')).toHaveLength(0);
    expect(await listStaples(db)).toHaveLength(0);
    expect(await db.getAll('SELECT * FROM providers')).toHaveLength(0);
    expect(await getSetting(db, 'phone_only')).toBeNull();
    expect(await db.getFirst('SELECT id FROM foods WHERE name = ?', ['Mom special'])).toBeNull();
    expect(await db.getFirst('SELECT 1 FROM food_names WHERE name_norm = ?', ['mom sabzi'])).toBeNull();
    expect(await countFoods(db)).toBe(builtIn);
  });

  it('leaves everything in place if deleting the model fails', async () => {
    const { db, keys } = await seeded();
    await expect(wipeAllData(db, { keys, deleteModel: async () => { throw new Error('disk'); } })).rejects.toThrow('disk');
    expect(needsOnboarding(await getProfile(db))).toBe(false);
    expect(await listLogs(db, '2026-11-25')).toHaveLength(1);
  });
});
