import { parseQty, unitsFor } from './portions';

// Number words, spelled the ways people actually type them (English and Hinglish).
const WORDS: Record<string, number> = {
  // English
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  half: 0.5, quarter: 0.25, couple: 2,
  // Hindi / Hinglish
  ek: 1, ak: 1, do: 2, teen: 3, tin: 3, char: 4, chaar: 4, paanch: 5, panch: 5, paach: 5,
  chhe: 6, chhah: 6, che: 6, chhey: 6, saat: 7, sat: 7, aath: 8, ath: 8, aat: 8, nau: 9, no: 9, das: 10, dus: 10,
  aadha: 0.5, adha: 0.5, aadhaa: 0.5, aadhi: 0.5, adhi: 0.5,
  dedh: 1.5, derh: 1.5, deadh: 1.5, dhai: 2.5, dhaai: 2.5, dhae: 2.5,
};

const SAWA = new Set(['sawa', 'sava']);
const SAADHE = new Set(['saadhe', 'saade', 'sade', 'sadhe']);

function wordValue(w: string): number | null {
  if (w in WORDS) return WORDS[w];
  const n = parseQty(w);
  return Number.isNaN(n) ? null : n;
}

/**
 * Read a quantity written as words or digits: "2", "do", "teen", "aadha", "dedh", "sawa do",
 * "saadhe teen", "one and a half", "half", "1/2". Returns null when it cannot be read.
 */
export function parseQuantityWords(input: string | number): number | null {
  if (typeof input === 'number') return Number.isFinite(input) && input > 0 ? input : null;
  const t = input.trim().toLowerCase().replace(/[.,!?]+$/, '').replace(/\s+/g, ' ');
  if (!t) return null;

  const direct = parseQty(t);
  if (!Number.isNaN(direct)) return direct > 0 ? direct : null;

  const parts = t.split(' ');
  if (parts.length === 1) return SAWA.has(parts[0]) ? 1.25 : wordValue(parts[0]);

  // "sawa do" = 2.25, "saadhe teen" = 3.5; "sawa" alone means 1.25
  if (SAWA.has(parts[0]) && parts.length === 2) {
    const v = wordValue(parts[1]);
    return v === null ? null : v + 0.25;
  }
  if (SAADHE.has(parts[0]) && parts.length === 2) {
    const v = wordValue(parts[1]);
    return v === null ? null : v + 0.5;
  }
  // "one and a half", "two and half", "1 and a half"
  const and = /^(.+?) and (?:a )?half$/.exec(t);
  if (and) {
    const v = wordValue(and[1]);
    return v === null ? null : v + 0.5;
  }
  if (t === 'a half' || t === 'a quarter') return t === 'a half' ? 0.5 : 0.25;
  return null;
}

// Spellings people use for units, mapped to the app's unit names.
const UNIT_ALIASES: Record<string, string> = {
  pc: 'piece', pcs: 'piece', piece: 'piece', pieces: 'piece', nos: 'piece', no: 'piece', number: 'piece', numbers: 'piece', unit: 'piece', units: 'piece',
  g: 'g', gm: 'g', gms: 'g', gr: 'g', gram: 'g', grams: 'g', gramme: 'g', grammes: 'g',
  ml: 'ml', millilitre: 'ml', milliliter: 'ml', millilitres: 'ml', milliliters: 'ml',
  katori: 'katori', katoris: 'katori', katora: 'katori', katoras: 'katori',
  bowl: 'bowl', bowls: 'bowl',
  cup: 'cup', cups: 'cup',
  glass: 'glass', glasses: 'glass', gilas: 'glass', gilaas: 'glass',
  scoop: 'scoop', scoops: 'scoop',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', tbs: 'tbsp',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp', chammach: 'tsp', chamach: 'tsp',
  slice: 'slice', slices: 'slice',
  plate: 'plate', plates: 'plate',
  packet: 'packet', packets: 'packet',
  clove: 'clove', cloves: 'clove',
};

export interface UnitResult {
  unit: string;
  /** False when the written unit was empty or unknown and the food's own unit was used instead. */
  recognized: boolean;
}

/**
 * Turn the unit a person wrote into a unit this food supports. Piece words ("pcs", "nos") mean the food's
 * own counting unit. Anything empty or unknown, or not usable for this food, becomes the food's own unit.
 */
export function normalizeUnit(raw: string | null | undefined, food: { unit: string }): UnitResult {
  const key = (raw ?? '').trim().toLowerCase().replace(/\.$/, '');
  if (!key) return { unit: food.unit, recognized: false };
  const canon = UNIT_ALIASES[key];
  if (!canon) return { unit: food.unit, recognized: false };
  if (canon === 'piece') return { unit: food.unit, recognized: food.unit !== 'g' && food.unit !== 'ml' };
  if (unitsFor(food).includes(canon)) return { unit: canon, recognized: true };
  return { unit: food.unit, recognized: false };
}

export type ResolvedQuantity =
  | { ok: true; qty: number; unit: string; unitRecognized: boolean }
  | { ok: false; error: string };

/** Quantity (number or words) and unit as written by the AI or user, resolved for one food. Missing quantity means 1. */
export function resolveQuantity(
  qty: number | string | null | undefined,
  unitRaw: string | null | undefined,
  food: { unit: string },
): ResolvedQuantity {
  const u = normalizeUnit(unitRaw, food);
  if (qty === null || qty === undefined || (typeof qty === 'string' && qty.trim() === '')) {
    return { ok: true, qty: 1, unit: u.unit, unitRecognized: u.recognized };
  }
  const n = parseQuantityWords(qty);
  if (n === null) return { ok: false, error: `Couldn't read the quantity "${qty}".` };
  return { ok: true, qty: n, unit: u.unit, unitRecognized: u.recognized };
}
