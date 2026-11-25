import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { DEFAULT_SLOTS } from '../../core/slots';
import { DbProvider } from '@/db/DbContext';
import { seedCatalog } from '@/db/foods';
import { migrate } from '@/db/migrations';
import type { Profile } from '@/db/profile';
import { createTestDb } from '@/db/testDb';
import { logHaptic } from '@/ui/haptics';
import EntryScreen from '../entry';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockDismissTo = jest.fn();
const mockReload = jest.fn(async () => {});
const mockParams: { foodId?: string; logId?: string } = { foodId: 'in-roti' };
const mockProfile: Profile = {
  name: null, goal: 'cut', dietType: 'veg', weightKg: null, heightCm: null, age: null, sex: null, activity: null,
  kcalTarget: 1800, proteinTargetG: 120, slots: DEFAULT_SLOTS, onboardedAt: 'x',
};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ dismissTo: mockDismissTo, back: jest.fn() }),
}));
jest.mock('@/db/ProfileContext', () => ({ useProfile: () => ({ profile: mockProfile }) }));
jest.mock('@/db/DayContext', () => ({ useDay: () => ({ reload: mockReload, logs: [] }) }));
jest.mock('@/ui/haptics', () => ({ logHaptic: jest.fn(async () => {}) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: unknown }) => children }));

const textOf = (n: { findAll: (f: (x: any) => boolean) => any[] }) =>
  n.findAll((x) => (x.type as unknown as string) === 'Text').map((x) => [x.props.children].flat(5).join('')).join('');

async function mount(): Promise<{ r: ReactTestRenderer; db: ReturnType<typeof createTestDb> }> {
  const db = createTestDb();
  await migrate(db);
  await seedCatalog(db);
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(
      <DbProvider value={db}>
        <EntryScreen />
      </DbProvider>,
    );
  });
  return { r, db };
}

describe('entry screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.foodId = 'in-roti';
    delete mockParams.logId;
  });

  it('logs the food, gives one vibration, and goes back to Today', async () => {
    const { r, db } = await mount();
    const logIt = r.root.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.type !== 'string' && textOf(n) === 'Log it')[0];
    await act(async () => {
      await logIt.props.onPress();
    });
    expect(logHaptic).toHaveBeenCalledTimes(1);
    expect(mockDismissTo).toHaveBeenCalledWith('/');
    const saved = await db.getAll<{ food_id: string; qty: number; unit: string }>('SELECT food_id, qty, unit FROM logs');
    expect(saved).toEqual([{ food_id: 'in-roti', qty: 1, unit: 'piece' }]);
  });
});
