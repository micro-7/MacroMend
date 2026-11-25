import type { Db } from '../db/db';
import { getSetting, setSetting } from '../db/settings';
import type { DownloadStatus, StateStore } from './downloadState';

export const PHONE_MODEL_STATE_KEY = 'phone_model_state';

const STATUSES: DownloadStatus[] = ['none', 'downloading', 'incomplete', 'ready'];

/** Remembers the phone model's download state in the settings table. */
export function settingsStateStore(db: Db): StateStore {
  return {
    async read() {
      const raw = await getSetting(db, PHONE_MODEL_STATE_KEY);
      if (!raw) return null;
      try {
        const v = JSON.parse(raw) as { status?: unknown; progress?: unknown; files?: unknown };
        if (!STATUSES.includes(v.status as DownloadStatus)) return null;
        return {
          status: v.status as DownloadStatus,
          progress: typeof v.progress === 'number' ? Math.min(1, Math.max(0, v.progress)) : 0,
          files: Array.isArray(v.files) ? v.files.filter((f): f is string => typeof f === 'string') : [],
        };
      } catch {
        return null;
      }
    },
    async write(s) {
      await setSetting(db, PHONE_MODEL_STATE_KEY, JSON.stringify(s));
    },
  };
}
