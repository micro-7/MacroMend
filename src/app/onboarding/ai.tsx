import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/ui/Text';
import { useDb } from '@/db/DbContext';
import { useProfile } from '@/db/ProfileContext';
import { completeOnboarding } from '@/db/profile';
import { listProviders, type ProviderRow } from '@/db/providers';
import { usePhoneModelOptional } from '@/phone/PhoneModelContext';
import { formatBytes, isSupportedPhone, MODEL_SIZE_BYTES } from '@/phone/deviceSupport';
import { startWithMobileDataPrompt } from '@/phone/startDownload';
import { buildProfile, buildStaples } from '@/onboarding/buildProfile';
import { useOnboardingDraft } from '@/onboarding/OnboardingDraft';
import { ProviderEditor } from '@/ui/forms/ProviderEditor';
import { Button, Hint, StepScreen } from '@/ui/kit';
import { palette } from '@/ui/theme';

/** Optional last step: add a free AI key to log by typing. Skipping still finishes setup. */
export default function AiStep() {
  const router = useRouter();
  const db = useDb();
  const { reload } = useProfile();
  const { draft } = useOnboardingDraft();
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phone = usePhoneModelOptional();
  const phoneSupported = !!phone?.facts && isSupportedPhone(phone.facts);
  const [phoneNote, setPhoneNote] = useState<string | null>(null);

  const load = useCallback(async () => setProviders(await listProviders(db)), [db]);
  useEffect(() => {
    let cancelled = false;
    listProviders(db).then((p) => {
      if (!cancelled) setProviders(p);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const finish = async () => {
    const profile = buildProfile(draft);
    if (!profile.ok) return setError(profile.error);
    const staples = buildStaples(draft.staples);
    if (!staples.ok) return setError(staples.error);
    setSaving(true);
    setError(null);
    try {
      await completeOnboarding(db, profile.value, staples.value);
      await reload(); // the route guard in the root layout then moves to the tabs
    } catch (e) {
      setError(`Couldn't save: ${e instanceof Error ? e.message : String(e)}`);
      setSaving(false);
    }
  };

  return (
    <StepScreen
      step="Step 6 of 6"
      title="AI setup (optional)"
      onBack={() => router.back()}
      onNext={finish}
      nextLabel={saving ? 'Saving…' : providers.length > 0 ? 'Finish' : "Skip, I'll log manually"}
      nextDisabled={saving || adding}
      error={error}
    >
      <Hint>
        Add a free key from Google Gemini, Groq or OpenRouter to log by typing, like &quot;2 roti and dal&quot; or &quot;office mein 2 samosa kha liye&quot;. Your key
        stays on this phone. You can skip this and add it later in Settings; searching and picking foods always works.
      </Hint>

      {phone && phoneSupported ? (
        <View style={styles.phoneBox}>
          <Text style={styles.name}>Phone model (no internet or key)</Text>
          <Text style={styles.model}>
            Your phone can run an AI model itself. It is a one-time download of about {formatBytes(MODEL_SIZE_BYTES)} on Wi-Fi; you can also do it later in
            Settings.
          </Text>
          {phone.state.status === 'downloading' ? <Text style={styles.model}>Downloading… {Math.round(phone.state.progress * 100)}%. It keeps going after you finish; keep the app open.</Text> : null}
          {phone.state.status === 'ready' ? <Text style={styles.model}>Downloaded and ready.</Text> : null}
          {phone.state.status === 'none' || phone.state.status === 'incomplete' ? (
            <Button
              label={phone.state.status === 'incomplete' ? 'Resume download' : 'Download phone model'}
              variant="secondary"
              onPress={async () => {
                setPhoneNote(null);
                setPhoneNote(await startWithMobileDataPrompt(phone.start));
              }}
            />
          ) : null}
          {phoneNote ? <Text style={styles.note}>{phoneNote}</Text> : null}
        </View>
      ) : null}

      {providers.map((p) => (
        <View key={p.id} style={styles.row}>
          <Text style={styles.name}>{p.label}</Text>
          <Text style={styles.model}>{p.model}</Text>
        </View>
      ))}

      {adding ? (
        <ProviderEditor
          onDone={async () => {
            setAdding(false);
            await load();
          }}
        />
      ) : (
        <View style={{ marginTop: 8 }}>
          <Button label={providers.length > 0 ? 'Add another provider' : 'Add a provider'} variant="secondary" onPress={() => setAdding(true)} />
        </View>
      )}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  name: { fontSize: 16, color: palette.text, fontWeight: '600' },
  model: { fontSize: 13, color: palette.muted },
  phoneBox: { paddingVertical: 12, marginBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  note: { fontSize: 13, color: palette.danger, marginTop: 6 },
});
