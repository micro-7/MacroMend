import {
  GIB, MIN_RAM_BYTES, MODEL_SIZE_BYTES, NEEDED_STORAGE_BYTES, UNSUPPORTED_MESSAGE, checkDownload, formatBytes, isSupportedPhone,
  ramSupported, type DeviceFacts,
} from '../deviceSupport';

const phone = (over: Partial<DeviceFacts> = {}): DeviceFacts => ({
  platform: 'android', totalMemoryBytes: 7.4 * GIB, freeStorageBytes: 20e9, network: 'wifi', ...over,
});

describe('memory check', () => {
  it('rejects a 6 GB phone and accepts an 8 GB phone (which reports about 7.4 GiB)', () => {
    expect(ramSupported(5.6 * GIB)).toBe(false); // sold as 6 GB
    expect(ramSupported(7.4 * GIB)).toBe(true); // sold as 8 GB
    expect(ramSupported(11.5 * GIB)).toBe(true); // sold as 12 GB
  });

  it('accepts exactly 7 GiB and rejects just under it', () => {
    expect(ramSupported(MIN_RAM_BYTES)).toBe(true);
    expect(ramSupported(MIN_RAM_BYTES - 1)).toBe(false);
  });

  it('treats unreadable memory as unsupported', () => {
    expect(ramSupported(null)).toBe(false);
  });

  it('is Android only', () => {
    expect(isSupportedPhone({ platform: 'android', totalMemoryBytes: 8 * GIB })).toBe(true);
    expect(isSupportedPhone({ platform: 'ios', totalMemoryBytes: 8 * GIB })).toBe(false);
  });
});

describe('checkDownload', () => {
  it('allows a supported phone with space on Wi-Fi', () => {
    expect(checkDownload(phone())).toEqual({ ok: true });
  });

  it('says "not supported" on a 6 GB phone, without mentioning storage or Wi-Fi', () => {
    expect(checkDownload(phone({ totalMemoryBytes: 5.6 * GIB, freeStorageBytes: 1e9, network: 'cellular' }))).toEqual({
      ok: false, reason: 'unsupported_phone', message: 'Phone model not supported on this phone',
    });
    expect(UNSUPPORTED_MESSAGE).toBe('Phone model not supported on this phone');
  });

  it('says how much space is needed when there is not enough (2 GB free)', () => {
    const r = checkDownload(phone({ freeStorageBytes: 2e9 }));
    expect(r).toMatchObject({ ok: false, reason: 'low_storage', neededBytes: NEEDED_STORAGE_BYTES });
    expect(r.ok === false && r.message).toBe('Not enough free space. You need about 4.0 GB free and have 2.0 GB.');
  });

  it('needs the model size plus 1 GB free', () => {
    expect(NEEDED_STORAGE_BYTES).toBe(MODEL_SIZE_BYTES + 1_000_000_000);
    expect(checkDownload(phone({ freeStorageBytes: NEEDED_STORAGE_BYTES - 1 })).ok).toBe(false);
    expect(checkDownload(phone({ freeStorageBytes: NEEDED_STORAGE_BYTES })).ok).toBe(true);
  });

  it('treats unreadable free space as not enough', () => {
    expect(checkDownload(phone({ freeStorageBytes: null }))).toMatchObject({ ok: false, reason: 'low_storage' });
  });

  it.each(['cellular', 'other', 'none', 'unknown'] as const)('asks for Wi-Fi when on %s', (network) => {
    const r = checkDownload(phone({ network }));
    expect(r).toMatchObject({ ok: false, reason: 'not_wifi' });
    expect(r.ok === false && r.message).toMatch(/Connect to Wi-Fi/);
  });

  it('formats sizes for people', () => {
    expect(formatBytes(2_950_000_000)).toBe('3.0 GB');
    expect(formatBytes(2_940_000_000)).toBe('2.9 GB');
    expect(formatBytes(450_000_000)).toBe('450 MB');
  });
});
