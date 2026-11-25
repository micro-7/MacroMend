import * as Haptics from 'expo-haptics';

/** One short vibration after food is logged. Phones without a vibrator, or with it turned off, simply do nothing. */
export async function logHaptic(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Not available on this phone; never let a vibration break logging.
  }
}
