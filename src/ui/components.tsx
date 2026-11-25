import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/ui/Text';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { fonts, palette, radius, space } from './theme';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** The big green card with a question and one action. */
export function HeroCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.hero, style]}>{children}</View>;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action} ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** A short friendly message with what to do next, shown where a list is empty. */
export function EmptyState({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message}</Text>
      {children}
    </View>
  );
}

/** Share of the track to fill, kept between 0 and 1. */
export function clampFraction(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const f = clampFraction(value);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(f * 100) }}
      style={styles.barTrack}
    >
      <View style={[styles.barFill, { width: `${f * 100}%` }]} />
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * A ring that fills to `value` (0 to 1; anything above 1 shows as full). The fill animates when the value
 * changes. Anything passed as children is drawn in the middle.
 */
export function ProgressRing({
  value,
  size = 96,
  stroke = 9,
  color = palette.coral,
  label,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  children?: ReactNode;
}) {
  const f = clampFraction(value);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(f);
  useEffect(() => {
    progress.value = withTiming(f, { duration: 600 });
  }, [f, progress]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.value) }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(f * 100) }}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={palette.cardHigh} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          fill="none"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.card, borderRadius: radius.card, padding: space.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.border },
  hero: { backgroundColor: palette.brand, borderRadius: radius.hero, padding: space.xl },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: space.lg, marginBottom: space.sm },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 17, color: palette.text },
  sectionAction: { fontFamily: fonts.medium, fontSize: 13, color: palette.muted },
  empty: { paddingVertical: space.lg, alignItems: 'flex-start', gap: space.sm },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: palette.muted, lineHeight: 20 },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: palette.cardHigh, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: palette.brandBright },
});
