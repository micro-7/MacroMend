import { migrate } from '../../db/migrations';
import { setSetting } from '../../db/settings';
import { createTestDb } from '../../db/testDb';
import { GIB } from '../deviceSupport';
import { PhoneModelDownloads, type Downloader } from '../downloadState';
import { PHONE_MODEL_STATE_KEY, settingsStateStore } from '../settingsStore';

async function db() {
  const d = createTestDb();
  await migrate(d);
  return d;
}

describe('settingsStateStore', () => {
  it('reads nothing before anything was saved', async () => {
    expect(await settingsStateStore(await db()).read()).toBeNull();
  });

  it('round-trips state', async () => {
    const d = await db();
    const store = settingsStateStore(d);
    await store.write({ status: 'incomplete', progress: 0.42, files: ['/a', '/b'] });
    expect(await store.read()).toEqual({ status: 'incomplete', progress: 0.42, files: ['/a', '/b'] });
  });

  it('ignores damaged or unknown saved state', async () => {
    const d = await db();
    const store = settingsStateStore(d);
    await setSetting(d, PHONE_MODEL_STATE_KEY, 'not json');
    expect(await store.read()).toBeNull();
    await setSetting(d, PHONE_MODEL_STATE_KEY, JSON.stringify({ status: 'weird', progress: 2 }));
    expect(await store.read()).toBeNull();
    await setSetting(d, PHONE_MODEL_STATE_KEY, JSON.stringify({ status: 'ready', progress: 7, files: ['/a', 5] }));
    expect(await store.read()).toEqual({ status: 'ready', progress: 1, files: ['/a'] });
  });

  it('lets an interrupted download be picked up after the app restarts', async () => {
    const d = await db();
    const downloader: Downloader = { download: async () => ['/a'], deleteFiles: async () => {}, verify: async () => true };
    const facts = async () => ({ platform: 'android', totalMemoryBytes: 8 * GIB, freeStorageBytes: 20e9, network: 'wifi' as const });
    const first = new PhoneModelDownloads({ downloader: { ...downloader, download: () => new Promise(() => {}) }, store: settingsStateStore(d), deviceFacts: facts });
    await first.start();
    // the app is killed here; a new run starts from what was saved
    const second = new PhoneModelDownloads({ downloader, store: settingsStateStore(d), deviceFacts: facts });
    expect((await second.load()).status).toBe('incomplete');
    await second.start();
    await second.whenSettled();
    expect(second.isReady()).toBe(true);
    const third = new PhoneModelDownloads({ downloader, store: settingsStateStore(d), deviceFacts: facts });
    expect(await third.load()).toMatchObject({ status: 'ready' });
  });
});
