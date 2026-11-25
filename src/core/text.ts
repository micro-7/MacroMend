/**
 * Normalise a food name for lookup: lower case, apostrophes removed, any other
 * punctuation turned into a space, repeated spaces collapsed, ends trimmed.
 * Devanagari letters are kept so Hindi aliases can be added later.
 */
export function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9ऀ-ॿ]+/g, ' ')
    .trim();
}
