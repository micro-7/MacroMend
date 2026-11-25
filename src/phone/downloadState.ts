import type { DeviceFacts, DownloadCheck } from './deviceSupport';
import { checkDownload } from './deviceSupport';

export type DownloadStatus = 'none' | 'downloading' | 'incomplete' | 'ready';

export interface DownloadState {
  status: DownloadStatus;
  /** 0 to 1. */
  progress: number;
  /** Why the last download stopped, when it did not finish. */
  error: string | null;
}

/** Fetches the model files. The real one uses react-native-executorch's downloader; tests use a fake. */
export interface Downloader {
  /** Download (or resume) every model file and return where they are saved. Rejects on failure or when aborted. */
  download(onProgress: (progress: number) => void, signal: AbortSignal): Promise<string[]>;
  /** Remove every model file, including partly downloaded ones. */
  deleteFiles(): Promise<void>;
  /** True when every saved file is still there and not empty. */
  verify(files: string[]): Promise<boolean>;
}

/** Where the state is remembered between app launches (the settings table). */
export interface StateStore {
  read(): Promise<{ status: DownloadStatus; progress: number; files: string[] } | null>;
  write(s: { status: DownloadStatus; progress: number; files: string[] }): Promise<void>;
}

export type StartResult = { started: true } | { started: false; check: Extract<DownloadCheck, { ok: false }> } | { started: false; alreadyRunning: true };

export interface DownloadDeps {
  downloader: Downloader;
  store: StateStore;
  /** Reads the phone's memory, free space and network right now. */
  deviceFacts: () => Promise<DeviceFacts>;
}

const WRITE_EVERY = 0.02;

/**
 * Keeps track of the phone model download: starting it only when the phone can take it, progress, cancelling
 * (which removes partial files), resuming after an interruption, and deleting. The model is only usable once
 * the status is "ready"; anything else, including a half-finished download, is never used.
 */
export class PhoneModelDownloads {
  private state: DownloadState = { status: 'none', progress: 0, error: null };
  private files: string[] = [];
  private abort: AbortController | null = null;
  private running: Promise<void> | null = null;
  private listeners = new Set<(s: DownloadState) => void>();

  constructor(private readonly deps: DownloadDeps) {}

  getState(): DownloadState {
    return this.state;
  }

  /** The files to load the model from, only when the model is ready. */
  getFiles(): string[] | null {
    return this.state.status === 'ready' ? this.files : null;
  }

  isReady(): boolean {
    return this.state.status === 'ready';
  }

  subscribe(fn: (s: DownloadState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private set(next: Partial<DownloadState>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((l) => l(this.state));
  }

  private persist() {
    return this.deps.store.write({ status: this.state.status, progress: this.state.progress, files: this.files });
  }

  /**
   * Read what was saved last time. A download that was running when the app closed is now "incomplete", and a
   * "ready" model whose files have gone missing goes back to "none".
   */
  async load(): Promise<DownloadState> {
    const saved = await this.deps.store.read();
    if (!saved) {
      this.state = { status: 'none', progress: 0, error: null };
      return this.state;
    }
    this.files = saved.files;
    if (saved.status === 'downloading') {
      this.state = { status: 'incomplete', progress: saved.progress, error: 'The download was interrupted. Resume to continue.' };
      await this.persist();
    } else if (saved.status === 'ready' && !(await this.deps.downloader.verify(saved.files))) {
      this.files = [];
      this.state = { status: 'none', progress: 0, error: 'The model files are missing. Download them again.' };
      await this.persist();
    } else {
      this.state = { status: saved.status, progress: saved.progress, error: null };
    }
    return this.state;
  }

  /** Start the download, or resume an interrupted one. Only starts when the phone supports it, has space and is on Wi-Fi. */
  async start(): Promise<StartResult> {
    if (this.state.status === 'downloading') return { started: false, alreadyRunning: true };
    const check = checkDownload(await this.deps.deviceFacts());
    if (!check.ok) return { started: false, check };

    this.abort = new AbortController();
    const signal = this.abort.signal;
    this.set({ status: 'downloading', error: null });
    await this.persist();

    let lastWritten = this.state.progress;
    this.running = (async () => {
      try {
        const files = await this.deps.downloader.download((p) => {
          if (signal.aborted) return;
          // Never go backwards when a resumed download recounts from zero.
          const progress = Math.max(this.state.progress, Math.min(1, p));
          this.set({ progress });
          if (progress - lastWritten >= WRITE_EVERY) {
            lastWritten = progress;
            void this.persist();
          }
        }, signal);
        this.files = files;
        this.set({ status: 'ready', progress: 1, error: null });
      } catch (e) {
        if (signal.aborted) return; // cancel() or delete() is handling the clean-up
        this.set({ status: 'incomplete', error: `Download interrupted: ${e instanceof Error ? e.message : String(e)}. Resume to continue.` });
      }
      await this.persist();
    })();
    return { started: true };
  }

  /** Wait for the running download to finish (used by tests and by cancel/delete). */
  async whenSettled(): Promise<void> {
    await this.running;
  }

  /** Stop a running download and remove everything downloaded so far. */
  async cancel(): Promise<void> {
    await this.removeEverything();
  }

  /** Remove the model (or a partial download) and free its space. */
  async delete(): Promise<void> {
    await this.removeEverything();
  }

  private async removeEverything() {
    this.abort?.abort();
    await this.running?.catch(() => undefined);
    this.abort = null;
    this.running = null;
    await this.deps.downloader.deleteFiles();
    this.files = [];
    this.set({ status: 'none', progress: 0, error: null });
    await this.persist();
  }
}
