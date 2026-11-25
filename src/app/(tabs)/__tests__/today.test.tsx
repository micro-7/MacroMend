import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { Profile } from '@/db/profile';
import type { LogEntry } from '@/db/logs';
import TodayScreen from '../index';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockPush = jest.fn();
const mockNavigate = jest.fn();
let mockProfile: Profile;
let mockLogs: LogEntry[];

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, navigate: mockNavigate }) }));
jest.mock('@/db/ProfileContext', () => ({ useProfile: () => ({ profile: mockProfile }) }));
jest.mock('@/db/DayContext', () => ({ useDay: () => ({ logs: mockLogs }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: unknown }) => children }));

const SLOTS = [
  { id: 'breakfast', name: 'Breakfast' },
  { id: 'lunch', name: 'Lunch' },
  { id: 'snack', name: 'Snack' },
  { id: 'pre', name: 'Pre workout' },
  { id: 'dinner', name: 'Dinner' },
];

const baseProfile: Profile = {
  name: 'Mihir', goal: 'cut', dietType: 'veg', weightKg: null, heightCm: null, age: null, sex: null, activity: null,
  kcalTarget: 1800, proteinTargetG: 120, slots: SLOTS, onboardedAt: '2026-11-25T00:00:00.000Z',
};

let id = 0;
const entry = (slot: string, foodName: string, kcal: number, proteinG: number, over: Partial<LogEntry> = {}): LogEntry => ({
  id: ++id, date: '2026-11-25', slot, foodId: foodName, foodName, qty: 2, unit: 'piece', grams: 80, kcal, proteinG,
  rawText: null, estimated: false, createdAt: 'x', ...over,
});

const texts = (r: ReactTestRenderer) =>
  r.root
    .findAll((n) => (n.type as unknown as string) === 'Text')
    .map((n) => [n.props.children].flat(5).filter((c: unknown) => typeof c === 'string' || typeof c === 'number').join(''))
    .join(' | ');

function render(): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => void (r = create(<TodayScreen />)));
  return r;
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 10, 25, 19, 30));
  mockPush.mockClear();
  mockNavigate.mockClear();
  mockProfile = baseProfile;
  mockLogs = [];
});
afterEach(() => jest.useRealTimers());

describe('Today screen', () => {
  it('greets by time of day and name, and without a name', () => {
    expect(texts(render())).toContain('Good evening, Mihir');
    mockProfile = { ...baseProfile, name: null };
    const t = texts(render());
    expect(t).toContain('Good evening');
    expect(t).not.toContain('Good evening,');
  });

  it('shows the hero card, and its button opens Fix my day', () => {
    const r = render();
    expect(r.root.findAll((n) => n.props.accessibilityLabel === 'Not sure what to eat next?').length).toBeGreaterThan(0);
    const fix = r.root.findAll(
      (n) => n.props.accessibilityRole === 'button' && typeof n.type !== 'string' && typeof n.props.onPress === 'function' && texts({ root: n } as unknown as ReactTestRenderer) === 'Fix my day',
    )[0];
    act(() => fix.props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/fix');
  });

  it('shows what is left after a log', () => {
    mockLogs = [entry('lunch', 'roti', 240, 7.2)];
    const t = texts(render());
    expect(t).toContain('1560 | kcal left');
    expect(t).toContain('112.8 | g protein left');
  });

  it('shows 2 of 5 meals logged', () => {
    mockLogs = [entry('breakfast', 'egg', 150, 12), entry('lunch', 'roti', 240, 7.2)];
    expect(texts(render())).toContain('2 of 5 | meals logged');
  });

  it('shows one card per meal in order, with entries on their cards and a friendly message on empty ones', () => {
    mockLogs = [entry('breakfast', 'egg', 150, 12), entry('dinner', 'dal', 135, 8.3)];
    const t = texts(render());
    const order = ['Breakfast', 'Lunch', 'Snack', 'Pre workout', 'Dinner'].map((n) => t.indexOf(n));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(t).toContain('2 piece · 150 kcal · 12.0 g protein');
    expect(t.match(/Nothing logged yet/g)).toHaveLength(3);
  });

  it('opens an entry for editing when it is tapped', () => {
    mockLogs = [entry('lunch', 'roti', 240, 7.2)];
    const r = render();
    const row = r.root.findAll((n) => n.props.accessibilityLabel === 'Edit roti' && typeof n.props.onPress === 'function')[0];
    act(() => row.props.onPress());
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/entry', params: { logId: String(mockLogs[0].id) } });
  });

  it('shows entries under Other when their meal no longer exists', () => {
    mockLogs = [entry('gone', 'chai', 50, 1.4)];
    const t = texts(render());
    expect(t).toContain('Other');
    expect(t).toContain('chai');
    expect(t).toContain('0 of 5 | meals logged');
  });

  it('warns when over the calorie target and when protein is met', () => {
    mockLogs = [entry('lunch', 'feast', 1950, 125)];
    const t = texts(render());
    expect(t).toContain('150 kcal over target');
    expect(t).toContain('0 | kcal left');
    expect(t).toContain('Protein target met');
  });

  it('adds food from an empty meal by going to the Log tab', () => {
    const r = render();
    const add = r.root.findAll((n) => n.props.accessibilityLabel === 'Add food to Lunch' && typeof n.props.onPress === 'function')[0];
    act(() => add.props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith('/log');
  });
});
