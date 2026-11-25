import { act, create } from 'react-test-renderer';
import { Text, familyForWeight } from '../Text';
import { fonts } from '../theme';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function fontOf(el: React.ReactElement) {
  let r: ReturnType<typeof create>;
  act(() => void (r = create(el)));
  const host = r!.root.findAll((n) => (n.type as unknown as string) === 'Text')[0];
  return { style: Object.assign({}, ...[host.props.style].flat(5).filter(Boolean)) as Record<string, unknown> };
}

describe('Text', () => {
  it.each([
    [undefined, fonts.body],
    ['400', fonts.body],
    ['500', fonts.medium],
    ['600', fonts.semibold],
    ['700', fonts.bold],
    ['bold', fonts.bold],
  ] as const)('weight %s uses %s', (weight, family) => {
    expect(familyForWeight(weight)).toBe(family);
  });

  it('uses Inter by default and drops fontWeight, which would break custom fonts on Android', () => {
    const { style } = fontOf(<Text style={{ fontSize: 14, fontWeight: '700' }}>x</Text>);
    expect(style).toMatchObject({ fontSize: 14, fontFamily: fonts.bold });
    expect(style.fontWeight).toBeUndefined();
  });

  it('keeps a font family that was set on purpose', () => {
    const { style } = fontOf(<Text style={{ fontFamily: fonts.display }}>x</Text>);
    expect(style.fontFamily).toBe(fonts.display);
  });
});
