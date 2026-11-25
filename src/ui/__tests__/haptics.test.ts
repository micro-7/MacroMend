import * as Haptics from 'expo-haptics';
import { logHaptic } from '../haptics';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));

describe('logHaptic', () => {
  it('gives one success vibration', async () => {
    (Haptics.notificationAsync as jest.Mock).mockResolvedValue(undefined);
    await logHaptic();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('never throws, even when the phone cannot vibrate', async () => {
    (Haptics.notificationAsync as jest.Mock).mockRejectedValue(new Error('no vibrator'));
    await expect(logHaptic()).resolves.toBeUndefined();
  });
});
