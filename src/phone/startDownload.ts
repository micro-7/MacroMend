import { Alert } from 'react-native';
import type { StartResult } from './downloadState';

/**
 * Start the phone model download. On mobile data it asks first; the answer decides whether to go on.
 * Returns a message to show when the download did not start (null when it started or the user said no).
 */
export async function startWithMobileDataPrompt(start: (opts?: { allowMobileData?: boolean }) => Promise<StartResult>): Promise<string | null> {
  const first = await start();
  if (first.started || !('check' in first)) return null;
  if (first.check.reason !== 'mobile_data') return first.check.message;
  const go = await new Promise<boolean>((resolve) =>
    Alert.alert('You are on mobile data', first.check.message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Download anyway', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }),
  );
  if (!go) return null;
  const second = await start({ allowMobileData: true });
  return !second.started && 'check' in second ? second.check.message : null;
}
