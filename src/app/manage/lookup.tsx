import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from '@/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { maskKey, secureKeyStore } from '@/ai/keyStore';
import { useDb } from '@/db/DbContext';
import { isOnlineLookupEnabled, setOnlineLookupEnabled } from '@/db/settings';
import { USDA_KEY_ID } from '@/lookup/services';
import { Button, Field, Hint, SectionTitle } from '@/ui/kit';
import { ATTRIBUTION } from '@/ui/OnlineFoodFlow';
import { palette } from '@/ui/theme';

export default function LookupSettings() {
  const db = useDb();
  const [enabled, setEnabled] = useState(true);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [key, setKey] = useState('');
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [on, k] = await Promise.all([isOnlineLookupEnabled(db), secureKeyStore.get(USDA_KEY_ID)]);
      if (!cancelled) {
        setEnabled(on);
        setSavedKey(k);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  const toggle = async (v: boolean) => {
    setEnabled(v);
    await setOnlineLookupEnabled(db, v);
  };

  const saveKey = async () => {
    const k = key.trim();
    if (!k) return;
    await secureKeyStore.set(USDA_KEY_ID, k);
    setSavedKey(k);
    setKey('');
    setNote('USDA key saved.');
  };

  const removeKey = async () => {
    await secureKeyStore.delete(USDA_KEY_ID);
    setSavedKey(null);
    setNote('USDA key removed. The shared demo key is used instead.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Online food lookup</Text>
            <Hint>When a food isn&apos;t in the table, search USDA and Open Food Facts for it. Only the food name is sent. Turn this off to stay fully offline.</Hint>
          </View>
          <Switch value={enabled} onValueChange={toggle} trackColor={{ true: palette.brand, false: palette.cardHigh }} accessibilityLabel="Online food lookup" />
        </View>

        <SectionTitle>USDA key (optional)</SectionTitle>
        <Hint>
          Without a key, USDA searches use a shared demo key that allows only a few searches per hour. A free key from USDA gives a much higher limit.
        </Hint>
        <Text style={styles.link} onPress={() => Linking.openURL('https://fdc.nal.usda.gov/api-key-signup')} accessibilityRole="link">
          Get a free USDA key
        </Text>
        <Field
          label={savedKey ? 'Replace the saved key' : 'USDA API key'}
          value={key}
          onChangeText={setKey}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={savedKey ? maskKey(savedKey) : 'Paste your key'}
        />
        <Button label="Save key" disabled={!key.trim()} onPress={saveKey} />
        {savedKey ? (
          <View style={{ marginTop: 8 }}>
            <Button label="Remove saved key" variant="danger" onPress={removeKey} />
          </View>
        ) : null}
        {note ? <Text style={styles.note}>{note}</Text> : null}

        <SectionTitle>Data sources</SectionTitle>
        <Hint>{ATTRIBUTION}</Hint>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 17, fontWeight: '600', color: palette.text },
  link: { color: palette.brandBright, fontSize: 14, marginBottom: 10, textDecorationLine: 'underline' },
  note: { color: palette.brandBright, marginTop: 10 },
});
