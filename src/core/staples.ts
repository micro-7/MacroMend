export const MAX_QTY_UNITS = 50;
export const MAX_QTY_GRAMS = 5000;

const GRAM_UNITS = new Set(['g', 'ml']);

export function isGramUnit(unit: string): boolean {
  return GRAM_UNITS.has(unit);
}

/** Usual quantity a newly ticked staple starts with: 100 g for gram foods, otherwise one unit. */
export function defaultUsualQty(unit: string): number {
  return isGramUnit(unit) ? 100 : 1;
}

/** Returns an error message for a bad usual quantity, or null when it is fine. */
export function validateUsualQty(qty: number, unit: string): string | null {
  if (!Number.isFinite(qty) || qty <= 0) return 'Enter a quantity above zero.';
  const max = isGramUnit(unit) ? MAX_QTY_GRAMS : MAX_QTY_UNITS;
  if (qty > max) return `Use ${max} or less.`;
  return null;
}
