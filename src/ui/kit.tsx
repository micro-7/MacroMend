import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type TextInputProps } from 'react-native';
import { TextInput } from '@/ui/TextInput';
import { Text } from '@/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Title } from './Title';
import { fonts, palette, radius, space } from './theme';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  /** `light` is the white pill used on the green hero card. */
  variant?: 'primary' | 'secondary' | 'danger' | 'light';
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles[variant], pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, variant === 'secondary' && { color: palette.brandBright }, variant === 'danger' && { color: palette.danger }, variant === 'light' && { color: palette.bg }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function OptionRow({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
    >
      <View style={[styles.radio, selected && styles.radioOn]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.optionLabel}>{label}</Text>
        {description ? <Text style={styles.optionDesc}>{description}</Text> : null}
      </View>
    </Pressable>
  );
}

export function Field({
  label,
  error,
  suffix,
  ...input
}: { label: string; error?: string | null; suffix?: string } & TextInputProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={palette.muted}
          style={[styles.input, error ? { borderColor: palette.danger } : null]}
          {...input}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <Text style={styles.hint}>{children}</Text>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <Text style={styles.error}>{children}</Text>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

/** Full-screen layout for one step: title, body, and a Back/Next footer. */
export function StepScreen({
  title,
  step,
  children,
  onBack,
  onNext,
  nextLabel = 'Next',
  nextDisabled = false,
  scroll = true,
  error,
}: {
  title: string;
  step?: string;
  children: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  scroll?: boolean;
  error?: string | null;
}) {
  const body = (
    <>
      {step ? <Text style={styles.step}>{step}</Text> : null}
      <Title style={styles.title}>{title}</Title>
      {children}
    </>
  );
  return (
    <SafeAreaView style={styles.safe}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, { flex: 1 }]}>{body}</View>
      )}
      <View style={styles.footer}>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <View style={styles.footerRow}>
          {onBack ? (
            <View style={{ flex: 1 }}>
              <Button label="Back" variant="secondary" onPress={onBack} />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <Button label={nextLabel} onPress={onNext} disabled={nextDisabled} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  scroll: { padding: space.xl, paddingBottom: space.md },
  step: { color: palette.muted, fontFamily: fonts.medium, fontSize: 13, marginBottom: space.xs },
  title: { marginBottom: space.lg },
  footer: { padding: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border, gap: space.sm, backgroundColor: palette.bg },
  footerRow: { flexDirection: 'row', gap: space.md },
  button: { paddingVertical: 14, paddingHorizontal: space.lg, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: palette.brand },
  secondary: { backgroundColor: palette.cardHigh },
  danger: { backgroundColor: palette.cardHigh },
  light: { backgroundColor: '#FFFFFF' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4 },
  buttonText: { color: palette.onBrand, fontFamily: fonts.semibold, fontSize: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
    marginBottom: 10,
  },
  optionSelected: { borderColor: palette.brandBright, backgroundColor: palette.cardHigh },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: palette.muted },
  radioOn: { borderColor: palette.brandBright, backgroundColor: palette.brandBright },
  optionLabel: { fontSize: 16, fontFamily: fonts.semibold, color: palette.text },
  optionDesc: { fontSize: 13, fontFamily: fonts.body, color: palette.muted, marginTop: 2 },
  fieldLabel: { fontSize: 14, fontFamily: fonts.medium, color: palette.muted, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.body,
    color: palette.text,
    backgroundColor: palette.card,
  },
  suffix: { color: palette.muted, fontFamily: fonts.body, fontSize: 15, minWidth: 28 },
  error: { color: palette.danger, fontFamily: fonts.body, fontSize: 13, marginTop: 4 },
  hint: { color: palette.muted, fontFamily: fonts.body, fontSize: 13, marginBottom: space.md, lineHeight: 19 },
  sectionTitle: { fontSize: 16, fontFamily: fonts.semibold, color: palette.text, marginTop: space.sm, marginBottom: space.sm },
});

export function Chip({ label, hint, selected, onPress }: { label: string; hint?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [chipStyles.chip, selected && chipStyles.on, pressed && styles.pressed]}
    >
      <Text style={[chipStyles.text, selected && { color: palette.onBrand }]}>{label}</Text>
      {hint ? <Text style={[chipStyles.hint, selected && { color: '#E6F2E6' }]}>{hint}</Text> : null}
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  on: { backgroundColor: palette.brand, borderColor: palette.brand },
  text: { color: palette.text, fontFamily: fonts.medium, fontSize: 14 },
  hint: { color: palette.muted, fontFamily: fonts.body, fontSize: 11 },
});
