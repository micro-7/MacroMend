import { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { OnboardingDraftProvider, useOnboardingDraft } from '@/onboarding/OnboardingDraft';
import GoalStep from '../goal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: unknown }) => children }));

const probe: { current: ReturnType<typeof useOnboardingDraft> | null } = { current: null };
function Probe() {
  const draft = useOnboardingDraft();
  useEffect(() => {
    probe.current = draft;
  });
  return null;
}
const draftRef = new Proxy({} as ReturnType<typeof useOnboardingDraft>, { get: (_t, k) => (probe.current as never)[k] });

function Harness({ show }: { show: boolean }) {
  return (
    <OnboardingDraftProvider>
      <Probe />
      {show ? <GoalStep /> : null}
    </OnboardingDraftProvider>
  );
}

const nameInput = (r: ReactTestRenderer) =>
  r.root.findAll((n) => (n.type as unknown as string) === 'TextInput' && n.props.accessibilityLabel === 'What should we call you? (optional)')[0];
const textOf = (n: { findAll: (f: (x: any) => boolean) => any[] }) =>
  n.findAll((x) => (x.type as unknown as string) === 'Text').map((x) => [x.props.children].flat(5).join('')).join('');
// The Next button is the Button whose text is "Next".
const next = (r: ReactTestRenderer) =>
  r.root.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.type !== 'string' && typeof n.props.onPress === 'function' && textOf(n) === 'Next')[0];

describe('onboarding goal step', () => {
  beforeEach(() => mockPush.mockClear());

  it('asks for an optional name and does not need it to continue', () => {
    let r!: ReactTestRenderer;
    act(() => void (r = create(<Harness show />)));
    expect(nameInput(r)).toBeTruthy();
    expect(nameInput(r).props.maxLength).toBe(30);
    act(() => draftRef.update({ goal: 'cut' }));
    expect(draftRef.draft.name).toBe('');
    expect(next(r).props.disabled).toBe(false);
    act(() => next(r).props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/onboarding/targets');
  });

  it('keeps the typed name when the user goes back to this step', () => {
    let r!: ReactTestRenderer;
    act(() => void (r = create(<Harness show />)));
    act(() => nameInput(r).props.onChangeText('Mihir'));
    expect(draftRef.draft.name).toBe('Mihir');
    act(() => r.update(<Harness show={false} />));
    act(() => r.update(<Harness show />));
    expect(nameInput(r).props.value).toBe('Mihir');
  });
});
