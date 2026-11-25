import { normalizeName } from './text';

export interface MatchFood {
  id: string;
  name: string;
  aliases: string[];
  /** Higher wins a tie between equally good matches. Foods the user saved themselves rank above bundled ones. */
  priority?: number;
}

interface IndexEntry {
  foodId: string;
  foodName: string;
  nameNorm: string;
  /** nameNorm with doubled vowels collapsed, so "daal" and "dal" meet. */
  collapsed: string;
  kind: 'name' | 'alias';
  priority: number;
}

export type MatchIndex = IndexEntry[];

export type MatchKind = 'exact' | 'variant' | 'fuzzy';

export interface FoodRef {
  foodId: string;
  foodName: string;
}

export interface FoodMatch extends FoodRef {
  kind: MatchKind;
  /** Other foods that match as well, shortest name first, for the user to switch to. */
  alternatives: FoodRef[];
}

const MAX_ALTERNATIVES = 5;

const collapseVowels = (s: string) => s.replace(/([aeiou])\1+/g, '$1');

export function buildMatchIndex(foods: MatchFood[]): MatchIndex {
  const out: MatchIndex = [];
  for (const f of foods) {
    const seen = new Set<string>();
    const add = (raw: string, kind: 'name' | 'alias') => {
      const nameNorm = normalizeName(raw);
      if (!nameNorm || seen.has(nameNorm)) return;
      seen.add(nameNorm);
      out.push({ foodId: f.id, foodName: f.name, nameNorm, collapsed: collapseVowels(nameNorm), kind, priority: f.priority ?? 0 });
    };
    add(f.name, 'name');
    f.aliases.forEach((a) => add(a, 'alias'));
  }
  return out;
}

/** Spellings that differ by more than a typo. Applied to whole words. */
const SPELLING: Record<string, string> = {
  panir: 'paneer', chapathi: 'chapati', chappati: 'chapati', dhal: 'dal', daal: 'dal', sabji: 'sabzi', sabzee: 'sabzi',
  chaawal: 'chawal', anda: 'egg', samose: 'samosa', parantha: 'paratha', parathe: 'paratha', dahee: 'dahi',
};

function singular(word: string): string {
  if (word.length > 3 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && /(ches|shes|xes|sses|oes)$/.test(word)) return word.slice(0, -2);
  if (word.length > 2 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/** Other spellings of a normalised name to try after an exact lookup fails. */
export function variantsOf(norm: string): string[] {
  const words = norm.split(' ');
  const last = words.length - 1;
  const forms = new Set<string>();
  const withLast = (w: string) => [...words.slice(0, last), w].join(' ');
  forms.add(withLast(singular(words[last])));
  forms.add(words.map((w) => SPELLING[w] ?? w).join(' '));
  forms.add(withLast(SPELLING[singular(words[last])] ?? singular(words[last])));
  forms.add(words.map(singular).join(' '));
  forms.add(collapseVowels(norm));
  forms.add(collapseVowels(words.map((w) => SPELLING[singular(w)] ?? singular(w)).join(' ')));
  forms.delete(norm);
  return [...forms].filter(Boolean);
}

/** Edit distance counting a swap of two neighbouring letters as one edit (optimal string alignment). */
export function editDistance(a: string, b: string, limit = Infinity): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const prev2: number[] = [];
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, (prev2[j - 2] ?? Infinity) + 1);
      cur[j] = v;
    }
    prev2.splice(0, prev2.length, ...prev);
    prev = cur;
  }
  return prev[b.length];
}

/** How many edits to allow: none for very short names, 1 for 4 to 5 letters, 2 for longer ones. */
export function fuzzyLimit(length: number): number {
  if (length <= 3) return 0;
  return length <= 5 ? 1 : 2;
}

const byQuality = (a: IndexEntry, b: IndexEntry) =>
  (a.kind === b.kind ? 0 : a.kind === 'name' ? -1 : 1) ||
  b.priority - a.priority ||
  a.foodName.length - b.foodName.length ||
  (a.foodId < b.foodId ? -1 : 1);

function toRefs(entries: IndexEntry[], skip: string): FoodRef[] {
  const seen = new Set<string>([skip]);
  const refs: FoodRef[] = [];
  for (const e of entries.slice().sort(byQuality)) {
    if (seen.has(e.foodId)) continue;
    seen.add(e.foodId);
    refs.push({ foodId: e.foodId, foodName: e.foodName });
    if (refs.length >= MAX_ALTERNATIVES) break;
  }
  return refs;
}

/** Foods that contain the query as a whole word (or words) in a name or alias, other than the match itself. */
function containing(index: MatchIndex, norm: string, skip: string): FoodRef[] {
  const padded = ` ${norm} `;
  return toRefs(index.filter((e) => ` ${e.nameNorm} `.includes(padded)), skip);
}

/**
 * Find the food a typed or AI-written name means: exact name or alias first, then spelling variants
 * (plurals, doubled vowels, Hinglish spellings), then a close typo. Returns null when nothing is close.
 */
export function matchFood(name: string, index: MatchIndex): FoodMatch | null {
  const norm = normalizeName(name);
  if (!norm) return null;

  const exact = index.filter((e) => e.nameNorm === norm);
  if (exact.length > 0) {
    const best = exact.slice().sort(byQuality)[0];
    return { foodId: best.foodId, foodName: best.foodName, kind: 'exact', alternatives: containing(index, norm, best.foodId) };
  }

  for (const v of variantsOf(norm)) {
    const hit = index.filter((e) => e.nameNorm === v || e.collapsed === v);
    if (hit.length > 0) {
      const best = hit.slice().sort(byQuality)[0];
      return { foodId: best.foodId, foodName: best.foodName, kind: 'variant', alternatives: containing(index, v, best.foodId) };
    }
  }

  const limit = fuzzyLimit(norm.length);
  if (limit === 0) return null;
  let bestDist = limit + 1;
  let close: IndexEntry[] = [];
  for (const e of index) {
    if (e.nameNorm[0] !== norm[0]) continue; // typos rarely change the first letter
    const d = Math.min(editDistance(norm, e.nameNorm, limit), editDistance(norm, e.collapsed, limit));
    if (d > limit) continue;
    if (d < bestDist) {
      bestDist = d;
      close = [e];
    } else if (d === bestDist) close.push(e);
  }
  if (close.length === 0) return null;
  const best = close.slice().sort(byQuality)[0];
  return { foodId: best.foodId, foodName: best.foodName, kind: 'fuzzy', alternatives: toRefs(close, best.foodId) };
}
