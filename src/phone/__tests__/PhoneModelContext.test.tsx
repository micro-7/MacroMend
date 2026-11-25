import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { migrate } from '../../db/migrations';
import { createTestDb } from '../../db/testDb';
import { GIB, type DeviceFacts } from '../deviceSupport';
import type { Downloader } from '../downloadState';
import { PhoneModelProvider, isPhoneOnly, usePhoneModel } from '../PhoneModelContext';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../deviceFacts', () => ({ readDeviceFacts: async () => ({}) }));

const phoneFacts: DeviceFacts = { platform: 'android', totalMemoryBytes: 8 * GIB, freeStorageBytes: 20e9, network: 'wifi' };
const engine = { openSession: async () => { throw new Error('not used'); } };

function fakeDownloader(): Downloader {
  let present = false;
  return {
    download: async (onProgress) => {
      onProgress(1);
      present = true;
      return ['model.pte'];
    },
    deleteFiles: async () => { present = false; },
    verify: async () => present,
  };
}

async function mount(db: ReturnType<typeof createTestDb>) {
  let value!: ReturnType<typeof usePhoneModel>;
  function Probe() {
    value = usePhoneModel();
    return null;
  }
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(
      <PhoneModelProvider db={db} services={{ downloader: fakeDownloader(), engine, readFacts: async () => phoneFacts }}>
        <Probe />
      </PhoneModelProvider>,
    );
  });
  return { get: () => value, unmount: () => act(async () => r.unmount()) };
}

describe('PhoneModelProvider', () => {
  it('starts with no model, downloads it, and is ready for the chain once done', async () => {
    const db = createTestDb();
    await migrate(db);
    const m = await mount(db);
    expect(m.get().state.status).toBe('none');
    expect(m.get().chainPhone.isReady()).toBe(false);
    await act(async () => { await m.get().start(); });
    expect(m.get().state.status).toBe('ready');
    expect(m.get().chainPhone.isReady()).toBe(true);
    await m.unmount();
  });

  it('remembers "Always use phone model" and deleting the model makes it unavailable', async () => {
    const db = createTestDb();
    await migrate(db);
    const m = await mount(db);
    await act(async () => { await m.get().setPhoneOnly(true); });
    expect(m.get().getPhoneOnly()).toBe(true);
    expect(await isPhoneOnly(db)).toBe(true);
    await act(async () => { await m.get().start(); });
    await act(async () => { await m.get().remove(); });
    expect(m.get().state.status).toBe('none');
    expect(m.get().chainPhone.isReady()).toBe(false);
    await m.unmount();
  });
});
