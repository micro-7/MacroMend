import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ProgressBar, ProgressRing, clampFraction } from '../components';
import { Button } from '../kit';
import { Title, splitEmphasis } from '../Title';
import { fonts } from '../theme';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function render(el: React.ReactElement): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => void (r = create(el)));
  return r;
}

describe('Title', () => {
  it('sets words between stars in italic and keeps the rest plain', () => {
    expect(splitEmphasis('Not sure *what* to *eat* next?')).toEqual([
      { text: 'Not sure ', italic: false },
      { text: 'what', italic: true },
      { text: ' to ', italic: false },
      { text: 'eat', italic: true },
      { text: ' next?', italic: false },
    ]);
  });

  it('leaves an unmatched star as plain text', () => {
    expect(splitEmphasis('5 * 3')).toEqual([{ text: '5 * 3', italic: false }]);
  });

  it('renders italic pieces in the italic font and reads aloud without stars', () => {
    const r = render(<Title>Fix *my* day</Title>);
    const header = r.root.findByProps({ accessibilityRole: 'header' });
    expect(header.props.accessibilityLabel).toBe('Fix my day');
    const fontsUsed = r.root.findAll((n) => (n.type as unknown as string) === 'Text' && n.props.style?.fontFamily).map((n) => n.props.style.fontFamily);
    expect(fontsUsed).toEqual(expect.arrayContaining([fonts.display, fonts.displayItalic]));
  });
});

describe('ProgressRing and ProgressBar', () => {
  it.each([
    [0, 0],
    [0.5, 50],
    [1.4, 100],
    [-1, 0],
    [Number.NaN, 0],
  ])('value %s reads as %s%%', (value, percent) => {
    expect(clampFraction(value)).toBe(percent / 100);
    const ring = render(<ProgressRing value={value} label="Calories" />);
    expect(ring.root.findByProps({ accessibilityRole: 'progressbar' }).props.accessibilityValue).toEqual({ min: 0, max: 100, now: percent });
    const bar = render(<ProgressBar value={value} label="Download" />);
    expect(bar.root.findByProps({ accessibilityRole: 'progressbar' }).props.accessibilityValue.now).toBe(percent);
  });
});

describe('Button', () => {
  it('calls onPress, and does not when disabled', () => {
    const onPress = jest.fn();
    const on = render(<Button label="Log it" onPress={onPress} />);
    act(() => on.root.findByProps({ accessibilityRole: 'button' }).props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);

    const off = render(<Button label="Log it" onPress={onPress} disabled />);
    const b = off.root.findByProps({ accessibilityRole: 'button' });
    expect(b.props.accessibilityState).toEqual({ disabled: true });
    expect(b.props.disabled).toBe(true);
  });

  it('shows pressed feedback through its style', () => {
    const r = render(<Button label="Log it" onPress={() => {}} variant="light" />);
    const style = r.root.findByProps({ accessibilityRole: 'button' }).props.style as (s: { pressed: boolean }) => unknown[];
    const flat = (pressed: boolean) => Object.assign({}, ...(style({ pressed }) as object[]).filter(Boolean));
    expect(flat(false).opacity).toBeUndefined();
    expect(flat(true)).toMatchObject({ opacity: 0.85 });
  });
});
