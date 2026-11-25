import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from './theme';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, styles[variant], disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, variant === 'secondary' && { color: colors.primary }, variant === 'danger' && { color: colors.danger }]}>
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
      style={[styles.option, selected && styles.optionSelected]}
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
          placeholderTextColor={colors.muted}
          style={[styles.input, error ? { borderColor: colors.danger } : null]}
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
      <Text style={styles.title}>{title}</Text>
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
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 12 },
  step: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 16 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, gap: 8 },
  footerRow: { flexDirection: 'row', gap: 12 },
  button: { paddingVertical: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface },
  danger: { backgroundColor: colors.surface },
  disabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: '#EEF6EE' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.muted },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  optionLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  optionDesc: { fontSize: 13, color: colors.muted, marginTop: 2 },
  fieldLabel: { fontSize: 14, color: colors.muted, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#fff',
  },
  suffix: { color: colors.muted, fontSize: 15, minWidth: 28 },
  error: { color: colors.danger, fontSize: 13, marginTop: 4 },
  hint: { color: colors.muted, fontSize: 13, marginBottom: 12, lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 8 },
});
