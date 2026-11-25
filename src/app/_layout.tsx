import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { DbProvider } from '@/db/DbContext';
import { ProfileProvider, useProfile } from '@/db/ProfileContext';
import { useAppDatabase } from '@/db/useAppDatabase';
import { ErrorScreen } from '@/ui/ErrorScreen';
import { colors } from '@/ui/theme';

function Routes() {
  const { onboarded } = useProfile();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* The app is only reachable once onboarding is finished; until then everything lands on step 1. */}
      <Stack.Protected guard={onboarded} redirectTo="/onboarding/goal">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="manage" />
      </Stack.Protected>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const { state, retry } = useAppDatabase();

  if (state.status === 'error') return <ErrorScreen message={state.message} onRetry={retry} />;
  if (state.status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <DbProvider value={state.db}>
      <ProfileProvider db={state.db}>
        <StatusBar style="dark" />
        <Routes />
      </ProfileProvider>
    </DbProvider>
  );
}
