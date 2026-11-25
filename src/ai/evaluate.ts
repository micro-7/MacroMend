import type { MatchIndex } from '../core/match';
import { resolveItems } from './resolve';
import type { ExpectedItem, Sentence } from './__fixtures__/sentences';
import type { ParseResult, ParseSlot } from './types';

export type ParseFn = (text: string) => Promise<ParseResult>;

export interface ActualItem {
  food: string | null;
  qty: number;
  unit: string;
  slot: string;
}

export interface SentenceScore {
  text: string;
  ok: boolean;
  expected: ExpectedItem[];
  actual: ActualItem[];
  error?: string;
}

export interface EvalResult {
  correct: number;
  total: number;
  scores: SentenceScore[];
  failures: SentenceScore[];
}

function sameItems(expected: ExpectedItem[], actual: ActualItem[]): boolean {
  if (expected.length !== actual.length) return false;
  const e = expected.slice().sort((a, b) => a.food.localeCompare(b.food));
  const a = actual.slice().sort((x, y) => (x.food ?? '').localeCompare(y.food ?? ''));
  return e.every(
    (x, i) =>
      a[i].food === x.food &&
      Math.abs(a[i].qty - x.qty) < 0.001 &&
      a[i].unit === x.unit &&
      (x.slot === undefined || a[i].slot === x.slot),
  );
}

/**
 * Run test sentences through a parser and the app's own matching and quantity rules, then compare with the
 * expected foods, amounts and units. Works for any parser (a cloud provider now, the phone model later).
 */
export interface EvalOptions {
  /** Called after each sentence with how many are done and the total. */
  onProgress?: (done: number, total: number) => void;
  /** Stop early (the score then covers only the sentences that ran). */
  signal?: AbortSignal;
}

export async function evaluate(
  sentences: Sentence[],
  parse: ParseFn,
  index: MatchIndex,
  foods: ReadonlyMap<string, { unit: string }>,
  slots: ParseSlot[],
  options: EvalOptions = {},
): Promise<EvalResult> {
  void slots;
  const scores: SentenceScore[] = [];
  for (const s of sentences) {
    if (options.signal?.aborted) break;
    const r = await parse(s.text);
    options.onProgress?.(scores.length + 1, sentences.length);
    if (!r.ok) {
      scores.push({ text: s.text, ok: false, expected: s.expected, actual: [], error: `${r.error}${r.message ? `: ${r.message}` : ''}` });
      continue;
    }
    const actual: ActualItem[] = resolveItems(r.items, index, foods).map((i) => ({
      food: i.foodId, qty: i.qty, unit: i.unit, slot: i.slot,
    }));
    scores.push({ text: s.text, ok: sameItems(s.expected, actual), expected: s.expected, actual });
  }
  const failures = scores.filter((x) => !x.ok);
  return { correct: scores.length - failures.length, total: scores.length, scores, failures };
}
