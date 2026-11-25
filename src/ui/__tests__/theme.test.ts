import { palette } from '../theme';

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const p = palette;
// [foreground, background, minimum ratio]: 4.5 for text, 3 for large headings and icons.
const PAIRS: [keyof typeof palette, keyof typeof palette, number][] = [
  ['text', 'bg', 4.5], ['text', 'card', 4.5], ['text', 'cardHigh', 4.5],
  ['muted', 'bg', 4.5], ['muted', 'card', 4.5], ['muted', 'cardHigh', 4.5],
  ['brandBright', 'bg', 4.5], ['brandBright', 'card', 4.5], ['brandBright', 'cardHigh', 4.5],
  ['warning', 'bg', 4.5], ['warning', 'card', 4.5],
  ['danger', 'bg', 4.5], ['danger', 'card', 4.5],
  ['onBrand', 'brand', 4.5],
  ['onBrand', 'coral', 3],
  ['coral', 'bg', 3], ['coral', 'card', 3],
];

describe('theme contrast', () => {
  it.each(PAIRS)('%s on %s is at least %s:1', (fg, bg, min) => {
    expect(contrast(p[fg], p[bg])).toBeGreaterThanOrEqual(min);
  });
});
