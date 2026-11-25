import { Alert } from 'react-native';
import type { StartResult } from '../downloadState';
import { startWithMobileDataPrompt } from '../startDownload';

const mobile: StartResult = { started: false, check: { ok: false, reason: 'mobile_data', message: 'You are on mobile data. Download anyway?' } };

function press(label: string) {
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
    buttons?.find((b) => b.text === label)?.onPress?.();
  });
}

afterEach(() => jest.restoreAllMocks());

describe('startWithMobileDataPrompt', () => {
  it('asks on mobile data and downloads when the user agrees', async () => {
    press('Download anyway');
    const start = jest.fn().mockResolvedValueOnce(mobile).mockResolvedValueOnce({ started: true });
    expect(await startWithMobileDataPrompt(start)).toBeNull();
    expect(start).toHaveBeenNthCalledWith(2, { allowMobileData: true });
  });

  it('does nothing when the user cancels', async () => {
    press('Cancel');
    const start = jest.fn().mockResolvedValue(mobile);
    expect(await startWithMobileDataPrompt(start)).toBeNull();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('does not ask on Wi-Fi', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    expect(await startWithMobileDataPrompt(jest.fn().mockResolvedValue({ started: true }))).toBeNull();
    expect(alert).not.toHaveBeenCalled();
  });

  it('shows the reason for other blocks without asking', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const start = jest.fn().mockResolvedValue({ started: false, check: { ok: false, reason: 'low_storage', message: 'Not enough free space.' } });
    expect(await startWithMobileDataPrompt(start)).toBe('Not enough free space.');
    expect(alert).not.toHaveBeenCalled();
  });
});
