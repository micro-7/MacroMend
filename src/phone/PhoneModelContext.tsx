import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { PhoneDeps } from '../ai/chain';
import { createPhoneParser, type PhoneParser } from '../ai/phoneModel';
import type { Db } from '../db/db';
import { getSetting, setSetting } from '../db/settings';
import { readDeviceFacts } from './deviceFacts';
import type { DeviceFacts } from './deviceSupport';
import { PhoneModelDownloads, type DownloadState, type Downloader, type StartResult } from './downloadState';
import { createRealDownloader, createRealEngine } from './engine';
import { settingsStateStore } from './settingsStore';
import type { PhoneEngine } from '../ai/phoneModel';

export const PHONE_ONLY_KEY = 'phone_only';

export async function isPhoneOnly(db: Db): Promise<boolean> {
  return (await getSetting(db, PHONE_ONLY_KEY)) === '1';
}

interface PhoneValue {
  state: DownloadState;
  /** What the phone can do right now; null until it has been read. */
  facts: DeviceFacts | null;
  refreshFacts: () => Promise<void>;
  /** "Always use phone model": nothing typed is sent to a cloud AI. */
  phoneOnly: boolean;
  setPhoneOnly: (on: boolean) => Promise<void>;
  start: () => Promise<StartResult>;
  cancel: () => Promise<void>;
  remove: () => Promise<void>;
  parser: PhoneParser;
  /** For the parsing chain: the phone model, and whether it can be used now. */
  chainPhone: PhoneDeps;
  /** The switch's current value, readable at any moment (for the parsing chain). */
  getPhoneOnly: () => boolean;
}

const Ctx = createContext<PhoneValue | null>(null);

export interface PhoneServices {
  downloader?: Downloader;
  engine?: PhoneEngine;
  readFacts?: () => Promise<DeviceFacts>;
}

/** Owns the phone model for the whole app: its download, the loaded model, and the privacy switch. */
export function PhoneModelProvider({ db, services = {}, children }: { db: Db; services?: PhoneServices; children: ReactNode }) {
  const readFacts = services.readFacts ?? readDeviceFacts;
  const downloads = useMemo(
    () => new PhoneModelDownloads({ downloader: services.downloader ?? createRealDownloader(), store: settingsStateStore(db), deviceFacts: readFacts }),
    // The services are created once per app run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db],
  );
  const parser = useMemo(
    () => createPhoneParser(services.engine ?? createRealEngine(() => downloads.getFiles())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [downloads],
  );
  const [state, setState] = useState<DownloadState>(downloads.getState());
  const [facts, setFacts] = useState<DeviceFacts | null>(null);
  const [phoneOnly, setPhoneOnlyState] = useState(false);
  const phoneOnlyRef = useRef(false);

  const refreshFacts = useCallback(async () => setFacts(await readFacts()), [readFacts]);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = downloads.subscribe((s) => {
      setState(s);
      // A model that is no longer ready (deleted, interrupted) must not stay loaded in memory.
      if (s.status !== 'ready') parser.unload();
    });
    (async () => {
      const [s, only, f] = await Promise.all([downloads.load(), isPhoneOnly(db), readFacts()]);
      if (cancelled) return;
      setState(s);
      phoneOnlyRef.current = only;
      setPhoneOnlyState(only);
      setFacts(f);
    })();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [db, downloads, parser, readFacts]);

  // Free the model's memory when the app goes to the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') parser.unload();
    });
    return () => sub.remove();
  }, [parser]);

  const setPhoneOnly = useCallback(
    async (on: boolean) => {
      phoneOnlyRef.current = on;
      setPhoneOnlyState(on);
      await setSetting(db, PHONE_ONLY_KEY, on ? '1' : '0');
    },
    [db],
  );

  const value = useMemo<PhoneValue>(
    () => ({
      state,
      facts,
      refreshFacts,
      phoneOnly,
      setPhoneOnly,
      start: async () => {
        await refreshFacts();
        return downloads.start();
      },
      cancel: () => downloads.cancel(),
      remove: async () => {
        parser.unload();
        await downloads.delete();
      },
      parser,
      chainPhone: { parser, isReady: () => downloads.isReady() },
      getPhoneOnly: () => phoneOnlyRef.current,
    }),
    [state, facts, refreshFacts, phoneOnly, setPhoneOnly, downloads, parser],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePhoneModel(): PhoneValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePhoneModel must be used inside <PhoneModelProvider>');
  return v;
}

/** Like usePhoneModel, but null when there is no provider (screens that also work without the phone model). */
export function usePhoneModelOptional(): PhoneValue | null {
  return useContext(Ctx);
}
