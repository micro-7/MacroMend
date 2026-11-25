import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/ui/Text';
import { palette } from './theme';

export function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Couldn&apos;t load your local data</Text>
      <Text style={styles.msg}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.button}>
        <Text style={styles.buttonText}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: palette.bg },
  title: { fontSize: 20, fontWeight: '700', color: palette.danger, textAlign: 'center' },
  msg: { marginTop: 12, color: palette.muted, textAlign: 'center' },
  button: { marginTop: 24, backgroundColor: palette.brand, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  buttonText: { color: palette.onBrand, fontWeight: '600', fontSize: 16 },
});
