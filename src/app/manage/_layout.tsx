import { Stack } from 'expo-router';
import { colors } from '@/ui/theme';

export default function ManageLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerTintColor: colors.primary, headerTitleStyle: { color: colors.text } }}>
      <Stack.Screen name="profile" options={{ title: 'Profile & targets' }} />
      <Stack.Screen name="slots" options={{ title: 'Meal slots' }} />
      <Stack.Screen name="staples" options={{ title: 'Usual foods' }} />
      <Stack.Screen name="providers" options={{ title: 'AI providers' }} />
      <Stack.Screen name="provider" options={{ title: 'AI provider' }} />
      <Stack.Screen name="foods" options={{ title: 'My foods' }} />
      <Stack.Screen name="food" options={{ title: 'Food' }} />
      <Stack.Screen name="phone" options={{ title: 'Phone model' }} />
      <Stack.Screen name="phone-test" options={{ title: 'Test phone model' }} />
      <Stack.Screen name="about" options={{ title: 'About' }} />
      <Stack.Screen name="lookup" options={{ title: 'Food lookup' }} />
    </Stack>
  );
}
