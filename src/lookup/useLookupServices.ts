import Constants from 'expo-constants';
import { useMemo } from 'react';
import { useDb } from '@/db/DbContext';
import { usePhoneModelOptional } from '@/phone/PhoneModelContext';
import { realServices, type LookupServices } from './services';

/** The real online search and AI estimate, tied to this phone's database and settings. */
export function useLookupServices(): LookupServices {
  const db = useDb();
  const phone = usePhoneModelOptional();
  const getPhoneOnly = phone?.getPhoneOnly;
  return useMemo(() => realServices(db, Constants.expoConfig?.version ?? '1.0.0', undefined, getPhoneOnly), [db, getPhoneOnly]);
}
