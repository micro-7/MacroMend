import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import licenses from '@/data/licenses.json';
import { PRIVACY_POINTS, DATA_SOURCES, PRIVACY_POLICY_URL } from '@/about/content';
import { useParseSession } from '@/ai/ParseSession';
import { secureKeyStore } from '@/ai/keyStore';
import { useDb } from '@/db/DbContext';
import { useProfile } from '@/db/ProfileContext';
import { wipeAllData } from '@/db/wipe';
import { usePhoneModelOptional } from '@/phone/PhoneModelContext';
import { Button, Hint, SectionTitle } from '@/ui/kit';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/theme';

export function buildNumber(): string {
  const extra = Constants.expoConfig?.extra as { buildNumber?: number } | undefined;
  return String(extra?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? 1);
}

export default function AboutScreen() {
  const db = useDb();
  const { reload } = useProfile();
  const { clear } = useParseSession();
  const phone = usePhoneModelOptional();
  const [showLicences, setShowLicences] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wipe = async () => {
    setWiping(true);
    setError(null);
    try {
      // Reset the in-memory switch first: wiping removes the stored setting itself.
      await phone?.setPhoneOnly(false);
      await wipeAllData(db, { keys: secureKeyStore, deleteModel: async () => void (await phone?.remove()) });
      clear();
      await reload(); // the route guard then moves to onboarding
    } catch (e) {
      setError(`Couldn't delete everything: ${e instanceof Error ? e.message : String(e)}`);
      setWiping(false);
    }
  };

  const confirmWipe = () =>
    Alert.alert(
      'Delete all my data?',
      'This removes your profile, logs, usual foods, saved foods, AI providers and keys, and the phone model from this phone. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete everything', style: 'destructive', onPress: wipe },
      ],
    );

  return (
    <Screen title="About">
      <ScrollView>
        <Text style={styles.name}>MacroMend</Text>
        <Text style={styles.line}>Version {Constants.expoConfig?.version ?? '1.0.0'} (build {buildNumber()})</Text>

        <SectionTitle>Your privacy</SectionTitle>
        {PRIVACY_POINTS.map((p) => (
          <Text key={p} style={styles.point}>• {p}</Text>
        ))}
        <Button label="Read the privacy policy" variant="secondary" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)} />

        <SectionTitle>Data sources</SectionTitle>
        {DATA_SOURCES.map((s) => (
          <View key={s.name} style={{ marginBottom: 8 }}>
            <Text style={styles.sourceName}>{s.name}</Text>
            <Text style={styles.small}>{s.detail}</Text>
          </View>
        ))}
        <Hint>Calories and protein always come from the food table. AI only reads what you type.</Hint>

        <SectionTitle>Open-source licences</SectionTitle>
        <Button
          label={showLicences ? 'Hide licences' : `Show ${licenses.length} libraries`}
          variant="secondary"
          onPress={() => setShowLicences((v) => !v)}
        />
        {showLicences
          ? licenses.map((l) => (
              <Text key={l.name} style={styles.small}>
                {l.name} {l.version} · {l.license}
              </Text>
            ))
          : null}

        <SectionTitle>Your data</SectionTitle>
        <Button label={wiping ? 'Deleting…' : 'Delete all my data'} variant="danger" onPress={confirmWipe} disabled={wiping} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  line: { fontSize: 16, color: colors.muted, marginBottom: 8 },
  point: { fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: 6 },
  sourceName: { fontSize: 16, color: colors.text, fontWeight: '600' },
  small: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  error: { color: colors.danger, marginTop: 8 },
});
