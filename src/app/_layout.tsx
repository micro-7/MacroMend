import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { DbProvider } from '@/db/DbContext';
import { useAppDatabase } from '@/db/useAppDatabase';
import { ErrorScreen } from '@/ui/ErrorScreen';
import { colors } from '@/ui/theme';

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
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </DbProvider>
  );
}
