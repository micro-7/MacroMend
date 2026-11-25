import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/theme';

export default function TodayScreen() {
  return (
    <Screen title="Today">
      <Text style={styles.hint}>Your calories and protein left for today will show here.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({ hint: { color: colors.muted, fontSize: 16 } });
