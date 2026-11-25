import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { ParseSessionProvider } from '@/ai/ParseSession';
import { DayProvider } from '@/db/DayContext';
import { DbProvider } from '@/db/DbContext';
import { ProfileProvider, useProfile } from '@/db/ProfileContext';
import { PhoneModelProvider } from '@/phone/PhoneModelContext';
import { useAppDatabase } from '@/db/useAppDatabase';
import { useAppFonts } from '@/ui/useAppFonts';
import { ErrorScreen } from '@/ui/ErrorScreen';
import { darkHeader } from '@/ui/headerOptions';
import { palette } from '@/ui/theme';

function Routes() {
  const { onboarded } = useProfile();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
      {/* The app is only reachable once onboarding is finished; until then everything lands on step 1. */}
      <Stack.Protected guard={onboarded} redirectTo="/onboarding/goal">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="manage" />
        <Stack.Screen name="entry" options={{ presentation: 'modal', headerShown: true, ...darkHeader, title: 'Log food' }} />
        <Stack.Screen name="fix" options={{ headerShown: true, ...darkHeader, title: 'Fix my day' }} />
        <Stack.Screen name="confirm" options={{ presentation: 'modal', headerShown: true, ...darkHeader, title: 'Check and log' }} />
      </Stack.Protected>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}

// Keep the splash screen up until the fonts are ready, so headings never flash in the wrong font.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const { state, retry } = useAppDatabase();
  const fontsReady = useAppFonts();
  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady]);
  if (!fontsReady) return null;

  if (state.status === 'error') return <ErrorScreen message={state.message} onRetry={retry} />;
  if (state.status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg }}>
        <ActivityIndicator size="large" color={palette.brandBright} />
      </View>
    );
  }

  return (
    <DbProvider value={state.db}>
      <ProfileProvider db={state.db}>
        <DayProvider db={state.db}>
          <PhoneModelProvider db={state.db}>
            <ParseSessionProvider>
              <StatusBar style="light" />
              <Routes />
            </ParseSessionProvider>
          </PhoneModelProvider>
        </DayProvider>
      </ProfileProvider>
    </DbProvider>
  );
}
