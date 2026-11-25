import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { secureKeyStore } from '@/ai/keyStore';
import { useDb } from '@/db/DbContext';
import { getProvider, type ProviderRow } from '@/db/providers';
import { ProviderEditor } from '@/ui/forms/ProviderEditor';
import { colors } from '@/ui/theme';

/** Add a provider, or edit the one named by the `id` route parameter. */
export default function ProviderScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const db = useDb();
  const [state, setState] = useState<{ provider?: ProviderRow; key: string | null } | null>(id ? null : { key: null });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const provider = (await getProvider(db, id)) ?? undefined;
      const key = provider ? await secureKeyStore.get(provider.id) : null;
      if (!cancelled) setState({ provider, key });
    })();
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  if (!state) return null;
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View>
          <ProviderEditor provider={state.provider} savedKey={state.key} onDone={() => router.back()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
});
