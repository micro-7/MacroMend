import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useDb } from '@/db/DbContext';
import { allProvidersOutOfQuota, listProviders } from '@/db/providers';
import { usePhoneModel } from '@/phone/PhoneModelContext';
import { formatBytes, isSupportedPhone, MODEL_SIZE_BYTES, NEEDED_STORAGE_BYTES, UNSUPPORTED_MESSAGE } from '@/phone/deviceSupport';
import { startWithMobileDataPrompt } from '@/phone/startDownload';
import { Button, ErrorText, Hint, SectionTitle } from '@/ui/kit';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/theme';

/** Settings → Phone model: support, download, delete, and the "Always use phone model" switch. */
export default function PhoneModelScreen() {
  const router = useRouter();
  const db = useDb();
  const phone = usePhoneModel();
  const { state, facts } = phone;
  const [message, setMessage] = useState<string | null>(null);
  const [cloudExhausted, setCloudExhausted] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      phone.refreshFacts();
      listProviders(db).then((p) => {
        if (!cancelled) setCloudExhausted(allProvidersOutOfQuota(p, new Date()));
      });
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db]),
  );

  const supported = facts ? isSupportedPhone(facts) : null;
  const download = async () => {
    setMessage(null);
    setMessage(await startWithMobileDataPrompt(phone.start));
  };

  return (
    <Screen title="Phone model">
      <Hint>
        The phone model reads what you type on this phone, with no internet and no key. It is only used to understand text; calories and protein
        always come from the food table.
      </Hint>

      {supported === null ? <Text style={styles.line}>Checking this phone…</Text> : null}
      {supported === false ? <Text style={styles.warn}>{UNSUPPORTED_MESSAGE}</Text> : null}

      {supported ? (
        <>
          <SectionTitle>Model</SectionTitle>
          <Text style={styles.line}>Gemma 4 E2B · download about {formatBytes(MODEL_SIZE_BYTES)}</Text>
          <Text style={styles.line}>
            Free space: {facts?.freeStorageBytes == null ? 'unknown' : formatBytes(facts.freeStorageBytes)} (needs {formatBytes(NEEDED_STORAGE_BYTES)})
          </Text>

          {state.status === 'none' ? <Button label="Download (Wi-Fi)" onPress={download} /> : null}
          {state.status === 'downloading' ? (
            <View accessibilityLiveRegion="polite">
              <Text style={styles.line}>Downloading… {Math.round(state.progress * 100)}%</Text>
              <Text style={styles.small}>Keep MacroMend open until it finishes.</Text>
              <Button label="Cancel download" variant="secondary" onPress={() => phone.cancel()} />
            </View>
          ) : null}
          {state.status === 'incomplete' ? (
            <View>
              <Text style={styles.line}>Download paused at {Math.round(state.progress * 100)}%. The model is not usable yet.</Text>
              <Button label="Resume download" onPress={download} />
              <View style={{ height: 8 }} />
              <Button label="Delete partial download" variant="secondary" onPress={() => phone.remove()} />
            </View>
          ) : null}
          {state.status === 'ready' ? (
            <View>
              <Text style={styles.ok}>Downloaded and ready</Text>
              <Button label="Test phone model" variant="secondary" onPress={() => router.push('/manage/phone-test')} />
              <View style={{ height: 8 }} />
              <Button label="Delete model" variant="danger" onPress={() => phone.remove()} />
            </View>
          ) : null}
          {message ? <ErrorText>{message}</ErrorText> : null}
          {state.error && state.status !== 'downloading' ? <ErrorText>{state.error}</ErrorText> : null}

          <SectionTitle>Use</SectionTitle>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Always use phone model</Text>
              <Text style={styles.small}>
                Nothing you type is sent to an AI service. Searching foods online (USDA, Open Food Facts) is separate; turn it off in Food lookup.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Always use phone model"
              value={phone.phoneOnly}
              onValueChange={(v) => phone.setPhoneOnly(v)}
              trackColor={{ true: colors.primary }}
            />
          </View>
          {phone.phoneOnly && state.status !== 'ready' ? (
            <Text style={styles.warn}>The phone model is not downloaded, so typed text can't be read. You can still pick foods by hand.</Text>
          ) : null}
          {cloudExhausted && state.status === 'ready' && !phone.phoneOnly ? (
            <Text style={styles.ok}>Using phone model until tomorrow (all your AI providers are out of quota today).</Text>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { fontSize: 16, color: colors.text, marginVertical: 6 },
  small: { fontSize: 13, color: colors.muted, marginVertical: 4, lineHeight: 18 },
  warn: { fontSize: 15, color: '#B26A00', marginVertical: 10, lineHeight: 22 },
  ok: { fontSize: 15, color: colors.primary, marginVertical: 8 },
  label: { fontSize: 16, color: colors.text, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
});
