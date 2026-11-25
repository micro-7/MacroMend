import { act, create } from 'react-test-renderer';
import { useAppFonts } from '../useAppFonts';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mockFonts: [boolean, Error | null] = [false, null];
jest.mock('expo-font', () => ({ useFonts: () => mockFonts }));
jest.mock('@expo-google-fonts/instrument-serif/400Regular', () => ({ InstrumentSerif_400Regular: 1 }));
jest.mock('@expo-google-fonts/instrument-serif/400Regular_Italic', () => ({ InstrumentSerif_400Regular_Italic: 2 }));
jest.mock('@expo-google-fonts/inter/400Regular', () => ({ Inter_400Regular: 1 }));
jest.mock('@expo-google-fonts/inter/500Medium', () => ({ Inter_500Medium: 2 }));
jest.mock('@expo-google-fonts/inter/600SemiBold', () => ({ Inter_600SemiBold: 3 }));
jest.mock('@expo-google-fonts/inter/700Bold', () => ({ Inter_700Bold: 4 }));

function ready(timeoutMs?: number): boolean {
  let value = false;
  function Probe() {
    value = useAppFonts(timeoutMs);
    return null;
  }
  act(() => void create(<Probe />));
  return value;
}

afterEach(() => {
  jest.useRealTimers();
  mockFonts = [false, null];
});

describe('useAppFonts', () => {
  it('is ready once the fonts have loaded', () => {
    mockFonts = [true, null];
    expect(ready()).toBe(true);
  });

  it('is ready when loading failed, so the app opens in the system font', () => {
    mockFonts = [false, new Error('x')];
    expect(ready()).toBe(true);
  });

  it('stops waiting after the timeout instead of hanging', () => {
    jest.useFakeTimers();
    let value = true;
    function Probe() {
      value = useAppFonts(1000);
      return null;
    }
    act(() => void create(<Probe />));
    expect(value).toBe(false);
    act(() => void jest.advanceTimersByTime(1100));
    expect(value).toBe(true);
  });
});
