import { secureKeyStore, type KeyStore } from '../ai/keyStore';
import { isOnline } from '../ai/online';
import type { Db } from '../db/db';
import { isOnlineLookupEnabled } from '../db/settings';
import { estimateFood, type EstimateResult } from './estimate';
import { searchOnline, type OnlineSearchResult } from './search';


/** The id the free USDA key is stored under in secure storage. */
export const USDA_KEY_ID = 'usda';

/** What the online-food screens call. Tests swap this for fakes. */
export interface LookupServices {
  search(query: string): Promise<OnlineSearchResult>;
  estimate(foodName: string): Promise<EstimateResult>;
}

export function realServices(db: Db, appVersion: string, keys: KeyStore = secureKeyStore): LookupServices {
  return {
    async search(query) {
      return searchOnline(query, {
        enabled: await isOnlineLookupEnabled(db),
        isOnline,
        usdaKey: await keys.get(USDA_KEY_ID),
        userAgent: `MacroMend/${appVersion} (Android)`,
      });
    },
    estimate(foodName) {
      return estimateFood({ db, keys, isOnline }, foodName);
    },
  };
}
