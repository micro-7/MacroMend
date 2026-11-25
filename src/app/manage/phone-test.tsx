import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/ui/Text';
import { SENTENCES } from '@/ai/__fixtures__/sentences';
import { evaluate, type EvalResult } from '@/ai/evaluate';
import { buildMatchIndex } from '@/core/match';
import { DEFAULT_SLOTS } from '@/core/slots';
import { useDb } from '@/db/DbContext';
import { loadMatchData } from '@/db/foods';
import { usePhoneModel } from '@/phone/PhoneModelContext';
import { Button, Hint, SectionTitle } from '@/ui/kit';
import { Screen } from '@/ui/Screen';
import { palette } from '@/ui/theme';

/** Runs the built-in sentences through the phone model and shows the score and every miss. */
export default function PhoneTestScreen() {
  const db = useDb();
  const phone = usePhoneModel();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<EvalResult | null>(null);
  const abort = useRef<AbortController | null>(null);
  const ready = phone.state.status === 'ready';

  useEffect(() => () => abort.current?.abort(), []);

  const run = async () => {
    const controller = new AbortController();
    abort.current = controller;
    setRunning(true);
    setResult(null);
    setProgress(0);
    try {
      const { index, units } = await loadMatchData(db);
      const r = await evaluate(
        SENTENCES,
        (t) => phone.parser.parse(t, { slots: DEFAULT_SLOTS }),
        index ?? buildMatchIndex([]),
        units,
        DEFAULT_SLOTS,
        { onProgress: (done) => setProgress(done), signal: controller.signal },
      );
      setResult(r);
    } finally {
      setRunning(false);
      phone.parser.unload();
    }
  };

  return (
    <Screen title="Test phone model">
      <ScrollView>
        <Hint>Runs {SENTENCES.length} sample sentences (English, Hinglish and mixed) and checks the foods, amounts and units. It can take a few minutes.</Hint>
        {!ready ? <Text style={styles.warn}>Download the phone model first (Settings → Phone model).</Text> : null}
        {running ? (
          <View accessibilityLiveRegion="polite">
            <Text style={styles.line}>
              Testing… {progress} / {SENTENCES.length}
            </Text>
            <Button label="Stop" variant="secondary" onPress={() => abort.current?.abort()} />
          </View>
        ) : (
          <Button label={result ? 'Run again' : 'Run test'} onPress={run} disabled={!ready} />
        )}

        {result ? (
          <View>
            <Text style={styles.score} accessibilityLiveRegion="polite">
              {result.correct} / {result.total} correct
            </Text>
            {result.failures.length > 0 ? <SectionTitle>Missed</SectionTitle> : <Text style={styles.line}>Every sentence was understood.</Text>}
            {result.failures.map((f) => (
              <View key={f.text} style={styles.miss}>
                <Text style={styles.text}>{f.text}</Text>
                <Text style={styles.small}>Expected: {f.expected.map((e) => `${e.qty} ${e.unit} ${e.food}`).join(', ')}</Text>
                {f.error ? (
                  <Text style={styles.small}>Error: {f.error}</Text>
                ) : (
                  <Text style={styles.small}>Got: {f.actual.map((a) => `${a.qty} ${a.unit} ${a.food ?? '(not found)'}`).join(', ') || '(nothing)'}</Text>
                )}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { fontSize: 16, color: palette.text, marginVertical: 6 },
  warn: { fontSize: 15, color: palette.warning, marginVertical: 10 },
  score: { fontSize: 24, fontWeight: '700', color: palette.text, marginVertical: 12 },
  miss: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  text: { fontSize: 15, color: palette.text, fontWeight: '600' },
  small: { fontSize: 13, color: palette.muted, marginTop: 2 },
});
