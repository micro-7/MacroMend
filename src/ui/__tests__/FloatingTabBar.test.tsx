import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { FloatingTabBar } from '../FloatingTabBar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const routes = [
  { key: 'index-1', name: 'index' },
  { key: 'log-1', name: 'log' },
  { key: 'settings-1', name: 'settings' },
];
const titles: Record<string, string> = { 'index-1': 'Today', 'log-1': 'Log', 'settings-1': 'Settings' };

function render(activeIndex: number, navigateToTab = jest.fn()): ReactTestRenderer {
  const props = {
    state: { index: activeIndex, routes },
    descriptors: Object.fromEntries(routes.map((r) => [r.key, { options: { title: titles[r.key] } }])),
    navigateToTab,
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  } as unknown as BottomTabBarProps;
  let r!: ReactTestRenderer;
  act(() => void (r = create(<FloatingTabBar {...props} />)));
  return r;
}

// Only the components that the app wrote (Pressable), not the native views it renders inside.
const tabs = (r: ReactTestRenderer) => r.root.findAll((n) => n.props.accessibilityRole === 'tab' && typeof n.props.onPress === 'function' && typeof n.type !== 'string');

describe('FloatingTabBar', () => {
  it('shows Today, Log and Settings and marks the active one', () => {
    const r = render(0);
    expect(tabs(r).map((t) => t.props.accessibilityLabel)).toEqual(['Today', 'Log', 'Settings']);
    expect(tabs(r).map((t) => t.props.accessibilityState.selected)).toEqual([true, false, false]);
  });

  it('marks the tab that is active now', () => {
    const r = render(2);
    expect(tabs(r).map((t) => t.props.accessibilityState.selected)).toEqual([false, false, true]);
  });

  it('switches tabs when one is tapped', () => {
    const navigateToTab = jest.fn();
    const r = render(0, navigateToTab);
    act(() => tabs(r)[1].props.onPress());
    expect(navigateToTab).toHaveBeenCalledWith('log-1');
  });
});
