import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Title } from './Title';
import { palette, space } from './theme';

/** A full screen on the dark background with a serif title. Words between *stars* in the title are set in italic. */
export function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.body}>
        <Title style={styles.title}>{title}</Title>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.lg },
  title: { marginBottom: space.lg },
});
