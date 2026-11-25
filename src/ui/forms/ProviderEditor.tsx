import { useState } from 'react';
import { Linking, StyleSheet, Switch, Text, View } from 'react-native';
import { secureKeyStore, maskKey, type KeyStore } from '@/ai/keyStore';
import type { CallOptions } from '@/ai/openaiCompat';
import { PRESETS, PRESET_KINDS } from '@/ai/presets';
import {
  createProvider, defaultsFor, removeProvider, saveProvider, testProvider, validateProviderForm,
  type FormErrors, type ProviderFormValues, type TestResult,
} from '@/ai/providerService';
import { useDb } from '@/db/DbContext';
import { updateProvider, type ProviderRow } from '@/db/providers';
import { Button, Chip, Field, Hint, SectionTitle } from '../kit';
import { colors } from '../theme';

/**
 * Add a provider (pick a service, paste a key) or edit one (model, key, on/off, delete).
 * Used by Settings and by the optional AI step in onboarding.
 */
export function ProviderEditor({
  provider,
  savedKey,
  onDone,
  keys = secureKeyStore,
  callOptions,
}: {
  /** The provider being edited; omit to add a new one. */
  provider?: ProviderRow;
  /** The saved key of the provider being edited, shown masked. */
  savedKey?: string | null;
  onDone: (result: 'saved' | 'deleted' | 'cancelled') => void;
  keys?: KeyStore;
  callOptions?: CallOptions;
}) {
  const db = useDb();
  const editing = !!provider;
  const [values, setValues] = useState<ProviderFormValues>(
    provider
      ? { kind: provider.kind, label: provider.label, baseUrl: provider.baseUrl, model: provider.model, apiKey: '' }
      : defaultsFor('groq'),
  );
  const [enabled, setEnabled] = useState(provider?.enabled ?? true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [test, setTest] = useState<TestResult | 'running' | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const preset = PRESETS[values.kind];
  const isCustom = values.kind === 'custom';

  const set = (patch: Partial<ProviderFormValues>) => {
    setValues((v) => ({ ...v, ...patch }));
    setTest(null);
  };

  const runTest = async () => {
    const errs = validateProviderForm(values, editing && !!savedKey);
    const needKey = !values.apiKey.trim() && !savedKey;
    if (needKey) errs.apiKey = 'Paste your API key.';
    if (Object.keys(errs).length > 0) return setErrors(errs);
    setErrors({});
    setTest('running');
    const apiKey = values.apiKey.trim() || savedKey || '';
    setTest(await testProvider({ ...values, apiKey }, { ...callOptions, db, providerId: provider?.id }));
  };

  const save = async () => {
    const errs = validateProviderForm(values, editing);
    if (Object.keys(errs).length > 0) return setErrors(errs);
    setErrors({});
    setBusy(true);
    setProblem(null);
    try {
      if (provider) {
        await saveProvider(db, keys, provider.id, values);
        if (enabled !== provider.enabled) await updateProvider(db, provider.id, { enabled });
      } else {
        await createProvider(db, keys, values);
      }
      onDone('saved');
    } catch (e) {
      setProblem(`Couldn't save: ${e instanceof Error ? e.message : String(e)}`);
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!provider) return;
    setBusy(true);
    try {
      await removeProvider(db, keys, provider.id);
      onDone('deleted');
    } catch (e) {
      setProblem(`Couldn't delete: ${e instanceof Error ? e.message : String(e)}`);
      setBusy(false);
    }
  };

  return (
    <View>
      {!editing ? (
        <>
          <SectionTitle>Service</SectionTitle>
          <View style={styles.chips}>
            {PRESET_KINDS.map((k) => (
              <Chip key={k} label={PRESETS[k].label} selected={values.kind === k} onPress={() => { setValues({ ...defaultsFor(k), apiKey: values.apiKey }); setTest(null); setErrors({}); }} />
            ))}
          </View>
        </>
      ) : null}

      <View style={{ marginTop: 16 }}>
        <Field label="Name" value={values.label} onChangeText={(label) => set({ label })} error={errors.label} />
        {isCustom ? (
          <Field label="Service address" value={values.baseUrl} onChangeText={(baseUrl) => set({ baseUrl })} error={errors.baseUrl} autoCapitalize="none" autoCorrect={false} placeholder="https://…/v1" />
        ) : null}
        <Field label="Model" value={values.model} onChangeText={(model) => set({ model })} error={errors.model} autoCapitalize="none" autoCorrect={false} />
        <Field
          label={editing ? 'API key (leave empty to keep the saved key)' : 'API key'}
          value={values.apiKey}
          onChangeText={(apiKey) => set({ apiKey })}
          error={errors.apiKey}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={editing && savedKey ? maskKey(savedKey) : 'Paste your key'}
        />
      </View>

      {preset.keyUrl ? (
        <Text style={styles.link} onPress={() => Linking.openURL(preset.keyUrl)} accessibilityRole="link">
          Get a free key
        </Text>
      ) : null}
      <Hint>{preset.privacy}</Hint>

      {editing ? (
        <View style={styles.switchRow}>
          <Text style={{ fontSize: 16, color: colors.text }}>Use this provider</Text>
          <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: colors.primary }} />
        </View>
      ) : null}

      <Button label={test === 'running' ? 'Testing…' : 'Test'} variant="secondary" disabled={test === 'running' || busy} onPress={runTest} />
      {test && test !== 'running' ? (
        <Text style={[styles.result, { color: test.ok ? colors.primary : colors.danger }]} accessibilityLiveRegion="polite">
          {test.ok ? 'OK: the key works and the model understood a test meal.' : test.message}
        </Text>
      ) : null}

      <View style={{ marginTop: 16 }}>
        <Button label={busy ? 'Saving…' : editing ? 'Save' : 'Add provider'} disabled={busy} onPress={save} />
      </View>
      {problem ? <Text style={styles.result}>{problem}</Text> : null}
      <View style={{ marginTop: 10 }}>
        {editing ? <Button label="Delete provider" variant="danger" disabled={busy} onPress={remove} /> : <Button label="Cancel" variant="secondary" disabled={busy} onPress={() => onDone('cancelled')} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  link: { color: colors.primary, fontSize: 14, marginBottom: 8, textDecorationLine: 'underline' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  result: { color: colors.danger, fontSize: 14, marginTop: 10, lineHeight: 20 },
});
