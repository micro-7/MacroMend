import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/theme';

export default function LogScreen() {
  return (
    <Screen title="Log">
      <Text style={styles.hint}>Search foods and log what you ate here.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({ hint: { color: colors.muted, fontSize: 16 } });
