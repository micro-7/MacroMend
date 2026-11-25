import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/ui/theme';

const icon = (glyph: string) =>
  function TabIcon() {
    return <Text style={{ fontSize: 20 }}>{glyph}</Text>;
  };

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="log" options={{ title: 'Log', tabBarIcon: icon('📝') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('⚙️') }} />
    </Tabs>
  );
}
