import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { GIB } from '@/phone/deviceSupport';
import type { DownloadState } from '@/phone/downloadState';
import PhoneModelScreen from '../phone';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mockState: DownloadState;
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }), useFocusEffect: () => {} }));
jest.mock('@/db/DbContext', () => ({ useDb: () => ({ getAll: async () => [] }) }));
jest.mock('@/db/providers', () => ({ listProviders: async () => [], allProvidersOutOfQuota: () => false }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: unknown }) => children }));
jest.mock('@/phone/PhoneModelContext', () => ({
  usePhoneModel: () => ({
    state: mockState,
    facts: { platform: 'android', totalMemoryBytes: 8 * 1024 ** 3, freeStorageBytes: 20e9, network: 'wifi' },
    refreshFacts: async () => {},
    phoneOnly: false,
    setPhoneOnly: async () => {},
    start: async () => ({ started: true }),
    cancel: async () => {},
    remove: async () => {},
  }),
}));

const texts = (r: ReactTestRenderer) =>
  r.root.findAll((n) => (n.type as unknown as string) === 'Text').map((n) => [n.props.children].flat(5).join('')).join(' | ');

function render(state: DownloadState): ReactTestRenderer {
  mockState = state;
  let r!: ReactTestRenderer;
  act(() => void (r = create(<PhoneModelScreen />)));
  return r;
}

describe('phone model screen', () => {
  it('shows a progress bar that matches the percentage while downloading', () => {
    const r = render({ status: 'downloading', progress: 0.42, error: null });
    expect(texts(r)).toContain('Downloading… 42%');
    const bar = r.root.findAll((n) => n.props.accessibilityLabel === 'Phone model download' && n.props.accessibilityRole === 'progressbar')[0];
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 42 });
  });

  it('shows no progress bar when nothing is downloading', () => {
    const r = render({ status: 'none', progress: 0, error: null });
    expect(r.root.findAll((n) => n.props.accessibilityLabel === 'Phone model download')).toHaveLength(0);
    expect(GIB).toBeGreaterThan(0);
  });
});
