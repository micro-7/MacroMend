import type Feather from '@expo/vector-icons/Feather';

export type SlotIconName = keyof typeof Feather.glyphMap;

const RULES: [RegExp, SlotIconName][] = [
  [/break|morning|nashta/, 'coffee'],
  [/lunch|noon/, 'sun'],
  [/dinner|supper|night/, 'moon'],
  [/snack|tea|evening/, 'shopping-bag'],
  [/workout|gym|pre|post|protein|shake/, 'zap'],
];

/** A line icon for a meal slot, chosen from words in its name. */
export function slotIcon(name: string): SlotIconName {
  const n = name.toLowerCase();
  return RULES.find(([re]) => re.test(n))?.[1] ?? 'clock';
}
