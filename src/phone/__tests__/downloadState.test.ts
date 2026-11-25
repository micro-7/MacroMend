import { GIB, type DeviceFacts } from '../deviceSupport';
import { PhoneModelDownloads, type DownloadStatus, type Downloader, type StateStore } from '../downloadState';

const goodPhone: DeviceFacts = { platform: 'android', totalMemoryBytes: 7.4 * GIB, freeStorageBytes: 20e9, network: 'wifi' };

/** A downloader the test controls: report progress, finish or fail when it says so. */
function fakeDownloader() {
  let report: (p: number) => void = () => {};
  let finish: (files: string[]) => void = () => {};
  let fail: (e: Error) => void = () => {};
  let present = false;
  const d: Downloader & { calls: number; deleted: number } = {
    calls: 0,
    deleted: 0,
    download: (onProgress, signal) =>
      new Promise((resolve, reject) => {
        d.calls++;
        report = onProgress;
        finish = (files) => {
          present = true;
          resolve(files);
        };
        fail = reject;
        signal.addEventListener('abort', () => reject(new Error('aborted')));
      }),
    deleteFiles: async () => {
      d.deleted++;
      present = false;
    },
    verify: async () => present,
  };
  return { d, report: (p: number) => report(p), finish: (f: string[]) => finish(f), fail: (e: Error) => fail(e), setPresent: (v: boolean) => (present = v) };
}

function memoryStore(initial: { status: DownloadStatus; progress: number; files: string[] } | null = null): StateStore & { saved: unknown[] } {
  let cur = initial;
  const saved: unknown[] = [];
  return { saved, read: async () => cur, write: async (s) => { cur = s; saved.push(s); } };
}

function setup(facts: Partial<DeviceFacts> = {}, store = memoryStore()) {
  const f = fakeDownloader();
  const m = new PhoneModelDownloads({ downloader: f.d, store, deviceFacts: async () => ({ ...goodPhone, ...facts }) });
  return { m, f, store };
}

describe('starting', () => {
  it('starts on a supported phone with space on Wi-Fi, shows progress and becomes ready', async () => {
    const { m, f } = setup();
    expect(await m.start()).toEqual({ started: true });
    expect(m.getState()).toMatchObject({ status: 'downloading', progress: 0 });
    f.report(0.25);
    expect(m.getState().progress).toBe(0.25);
    f.report(0.9);
    f.finish(['/m/model.pte', '/m/tok.json']);
    await m.whenSettled();
    expect(m.getState()).toEqual({ status: 'ready', progress: 1, error: null });
    expect(m.isReady()).toBe(true);
    expect(m.getFiles()).toEqual(['/m/model.pte', '/m/tok.json']);
  });

  it.each([
    ['not enough storage (2 GB free)', { freeStorageBytes: 2e9 }, 'low_storage'],
    ['mobile data', { network: 'cellular' as const }, 'not_wifi'],
    ['a 6 GB phone', { totalMemoryBytes: 5.6 * GIB }, 'unsupported_phone'],
  ])('does not start with %s, and says why', async (_n, facts, reason) => {
    const { m, f } = setup(facts);
    const r = await m.start();
    expect(r).toMatchObject({ started: false, check: { ok: false, reason } });
    expect(f.d.calls).toBe(0);
    expect(m.getState().status).toBe('none');
  });

  it('ignores a second start while downloading', async () => {
    const { m, f } = setup();
    await m.start();
    expect(await m.start()).toEqual({ started: false, alreadyRunning: true });
    expect(f.d.calls).toBe(1);
  });

  it('never moves the progress bar backwards', async () => {
    const { m, f } = setup();
    await m.start();
    f.report(0.6);
    f.report(0.1);
    expect(m.getState().progress).toBe(0.6);
  });

  it('tells listeners about every change', async () => {
    const { m, f } = setup();
    const seen: string[] = [];
    m.subscribe((s) => seen.push(`${s.status}:${s.progress}`));
    await m.start();
    f.report(0.5);
    f.finish(['/a']);
    await m.whenSettled();
    expect(seen).toEqual(['downloading:0', 'downloading:0.5', 'ready:1']);
  });
});

describe('interruptions and resuming', () => {
  it('goes to "incomplete" with a reason when the download fails (Wi-Fi lost), and is not usable', async () => {
    const { m, f } = setup();
    await m.start();
    f.report(0.4);
    f.fail(new Error('Network request failed'));
    await m.whenSettled();
    expect(m.getState()).toMatchObject({ status: 'incomplete', progress: 0.4 });
    expect(m.getState().error).toMatch(/interrupted.*Resume/);
    expect(m.isReady()).toBe(false);
    expect(m.getFiles()).toBeNull();
  });

  it('resumes from where it was, keeps the progress, and can finish', async () => {
    const { m, f } = setup();
    await m.start();
    f.report(0.4);
    f.fail(new Error('offline'));
    await m.whenSettled();
    expect(await m.start()).toEqual({ started: true });
    expect(m.getState()).toMatchObject({ status: 'downloading', progress: 0.4, error: null });
    f.finish(['/a']);
    await m.whenSettled();
    expect(m.isReady()).toBe(true);
  });

  it('resuming needs Wi-Fi again', async () => {
    const store = memoryStore({ status: 'incomplete', progress: 0.5, files: [] });
    const { m } = setup({ network: 'cellular' }, store);
    await m.load();
    expect(await m.start()).toMatchObject({ started: false, check: { reason: 'not_wifi' } });
  });

  it('treats a download that was running when the app closed as incomplete, with the Resume option', async () => {
    const store = memoryStore({ status: 'downloading', progress: 0.7, files: [] });
    const { m } = setup({}, store);
    expect(await m.load()).toMatchObject({ status: 'incomplete', progress: 0.7 });
    expect(m.isReady()).toBe(false);
    expect((await store.read())?.status).toBe('incomplete');
  });
});

describe('cancel and delete', () => {
  it('cancel stops the download and removes partial files', async () => {
    const { m, f } = setup();
    await m.start();
    f.report(0.3);
    await m.cancel();
    expect(m.getState()).toEqual({ status: 'none', progress: 0, error: null });
    expect(f.d.deleted).toBe(1);
  });

  it('cancel also clears an interrupted download', async () => {
    const { m, f } = setup();
    await m.start();
    f.fail(new Error('x'));
    await m.whenSettled();
    await m.cancel();
    expect(m.getState().status).toBe('none');
    expect(f.d.deleted).toBe(1);
  });

  it('delete removes a finished model and the app stops using it', async () => {
    const { m, f } = setup();
    await m.start();
    f.finish(['/a']);
    await m.whenSettled();
    await m.delete();
    expect(m.isReady()).toBe(false);
    expect(m.getFiles()).toBeNull();
    expect(f.d.deleted).toBe(1);
  });

  it('a cancelled download that then finishes does not come back to life', async () => {
    const { m, f } = setup();
    await m.start();
    await m.cancel();
    f.finish(['/late']);
    await Promise.resolve();
    expect(m.getState().status).toBe('none');
  });
});

describe('remembering between launches', () => {
  it('loads a ready model whose files are still there', async () => {
    const store = memoryStore({ status: 'ready', progress: 1, files: ['/a'] });
    const { m, f } = setup({}, store);
    f.setPresent(true);
    expect(await m.load()).toEqual({ status: 'ready', progress: 1, error: null });
    expect(m.getFiles()).toEqual(['/a']);
  });

  it('forgets a ready model whose files have gone (cleared app data), so it is never used', async () => {
    const store = memoryStore({ status: 'ready', progress: 1, files: ['/a'] });
    const { m, f } = setup({}, store);
    f.setPresent(false);
    const s = await m.load();
    expect(s.status).toBe('none');
    expect(s.error).toMatch(/missing/);
    expect(m.getFiles()).toBeNull();
  });

  it('starts as "none" when nothing was saved', async () => {
    const { m } = setup();
    expect(await m.load()).toEqual({ status: 'none', progress: 0, error: null });
  });

  it('saves progress now and then, and the final state', async () => {
    const { m, f, store } = setup();
    await m.start();
    for (let p = 0.01; p <= 0.5; p += 0.01) f.report(p);
    f.finish(['/a']);
    await m.whenSettled();
    const writes = store.saved as { status: string }[];
    expect(writes.length).toBeGreaterThan(3);
    expect(writes.length).toBeLessThan(40); // not on every tick
    expect(writes.at(-1)).toMatchObject({ status: 'ready', files: ['/a'] });
  });
});
