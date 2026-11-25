import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/ui/theme';
import type { Db } from './db';
import { getProfile, needsOnboarding, type Profile } from './profile';

interface ProfileValue {
  profile: Profile | null;
  /** True once onboarding has been completed. */
  onboarded: boolean;
  /** Re-read the profile from the database after it was changed. */
  reload: () => Promise<void>;
}

const ProfileContext = createContext<ProfileValue | null>(null);

export function ProfileProvider({ db, children }: { db: Db; children: ReactNode }) {
  const [state, setState] = useState<{ loaded: boolean; profile: Profile | null }>({ loaded: false, profile: null });

  const reload = useCallback(async () => {
    const profile = await getProfile(db);
    setState({ loaded: true, profile });
  }, [db]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!state.loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ProfileContext.Provider value={{ profile: state.profile, onboarded: !needsOnboarding(state.profile), reload }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileValue {
  const v = useContext(ProfileContext);
  if (!v) throw new Error('useProfile must be used inside <ProfileProvider>');
  return v;
}
