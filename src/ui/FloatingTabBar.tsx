import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/ui/Text';
import { fonts, palette, radius, space } from './theme';

const ICONS: Record<string, keyof typeof Feather.glyphMap> = { index: 'home', log: 'edit-3', settings: 'settings' };

/** A rounded bar floating above the bottom edge; the active tab gets a coral circle behind its icon. */
export function FloatingTabBar({ state, descriptors, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const onPress = () => navigateToTab(route.key);
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              style={({ pressed }) => [styles.tab, pressed && { opacity: 0.8 }]}
            >
              <View style={[styles.circle, focused && styles.circleOn]}>
                <Feather name={ICONS[route.name] ?? 'circle'} size={22} color={focused ? palette.onBrand : palette.muted} />
              </View>
              <Text style={[styles.label, focused && { color: palette.text }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: palette.card,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  tab: { alignItems: 'center', minWidth: 72, gap: 2 },
  circle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  circleOn: { backgroundColor: palette.coral },
  label: { fontFamily: fonts.medium, fontSize: 11, color: palette.muted },
});
