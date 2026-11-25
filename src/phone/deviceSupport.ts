export const GIB = 1024 ** 3;

/**
 * Phones sold as "8 GB" report about 7.2 to 7.6 GiB of usable memory, so the cut-off is 7 GiB.
 * Gemma 4 E2B needs roughly that much to run beside Android itself.
 */
export const MIN_RAM_BYTES = 7 * GIB;

/** Rough download size of the Gemma 4 E2B model (the spec says about 2.4 to 3 GB). Used for the storage check. */
export const MODEL_SIZE_BYTES = 3_000_000_000;

/** Free space to keep after the download, so the phone does not fill up. */
export const STORAGE_MARGIN_BYTES = 1_000_000_000;

export type NetworkKind = 'wifi' | 'cellular' | 'other' | 'none' | 'unknown';

/** What we know about this phone right now. `null` means it could not be read. */
export interface DeviceFacts {
  platform: string;
  totalMemoryBytes: number | null;
  freeStorageBytes: number | null;
  network: NetworkKind;
}

export type DownloadBlock = 'unsupported_phone' | 'low_storage' | 'not_wifi';

export type DownloadCheck =
  | { ok: true }
  | { ok: false; reason: DownloadBlock; message: string; neededBytes?: number };

export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(Math.round(bytes / 1e8) / 10).toFixed(1)} GB`;
  return `${Math.round(bytes / 1e6)} MB`;
}

/** True when the phone has enough memory for the phone model. If memory cannot be read, the phone is treated as unsupported. */
export function ramSupported(totalMemoryBytes: number | null): boolean {
  return totalMemoryBytes !== null && totalMemoryBytes >= MIN_RAM_BYTES;
}

export function isSupportedPhone(f: Pick<DeviceFacts, 'platform' | 'totalMemoryBytes'>): boolean {
  return f.platform === 'android' && ramSupported(f.totalMemoryBytes);
}

export const UNSUPPORTED_MESSAGE = 'Phone model not supported on this phone';

/** Free space needed to start the download. */
export const NEEDED_STORAGE_BYTES = MODEL_SIZE_BYTES + STORAGE_MARGIN_BYTES;

/** Whether the download may start now, or what is in the way and how to fix it. */
export function checkDownload(f: DeviceFacts): DownloadCheck {
  if (!isSupportedPhone(f)) return { ok: false, reason: 'unsupported_phone', message: UNSUPPORTED_MESSAGE };
  if (f.freeStorageBytes === null || f.freeStorageBytes < NEEDED_STORAGE_BYTES) {
    const have = f.freeStorageBytes === null ? 'unknown' : formatBytes(f.freeStorageBytes);
    return {
      ok: false,
      reason: 'low_storage',
      neededBytes: NEEDED_STORAGE_BYTES,
      message: `Not enough free space. You need about ${formatBytes(NEEDED_STORAGE_BYTES)} free and have ${have}.`,
    };
  }
  if (f.network !== 'wifi') {
    return { ok: false, reason: 'not_wifi', message: `Connect to Wi-Fi to download the phone model (about ${formatBytes(MODEL_SIZE_BYTES)}).` };
  }
  return { ok: true };
}
