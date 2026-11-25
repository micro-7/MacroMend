import { Stack } from 'expo-router';
import { colors } from '@/ui/theme';

export default function ManageLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerTintColor: colors.primary, headerTitleStyle: { color: colors.text } }}>
      <Stack.Screen name="profile" options={{ title: 'Profile & targets' }} />
      <Stack.Screen name="slots" options={{ title: 'Meal slots' }} />
      <Stack.Screen name="staples" options={{ title: 'Usual foods' }} />
    </Stack>
  );
}
