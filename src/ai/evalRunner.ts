import { buildMatchIndex } from '../core/match';
import { DEFAULT_SLOTS } from '../core/slots';
import { ALL_FOODS } from '../data/foods';
import { SENTENCES } from './__fixtures__/sentences';
import { evaluate } from './evaluate';
import { createCloudParser } from './openaiCompat';
import { PRESETS } from './presets';
import type { ProviderKind } from '../db/providers';

type Env = Record<string, string | undefined>;

/**
 * `npm run eval:parse`: run the test sentences against a real provider and print how many were understood.
 * Reads EVAL_PROVIDER (gemini, groq, openrouter or custom; default groq), EVAL_API_KEY (required),
 * EVAL_MODEL and EVAL_BASE_URL (optional; required for custom). The key is never printed.
 * Returns the process exit code.
 */
export async function runEvalFromEnv(env: Env, fetchFn?: typeof fetch, log: (line: string) => void = console.log): Promise<number> {
  const kind = (env.EVAL_PROVIDER ?? 'groq') as ProviderKind;
  const preset = PRESETS[kind];
  if (!preset) {
    log(`Unknown EVAL_PROVIDER "${kind}". Use gemini, groq, openrouter or custom.`);
    return 1;
  }
  const apiKey = env.EVAL_API_KEY;
  if (!apiKey) {
    log('Set EVAL_API_KEY to your provider key, for example: EVAL_PROVIDER=groq EVAL_API_KEY=... npm run eval:parse');
    return 1;
  }
  const baseUrl = env.EVAL_BASE_URL || preset.baseUrl;
  const model = env.EVAL_MODEL || preset.model;
  if (!baseUrl || !model) {
    log('A custom provider needs EVAL_BASE_URL and EVAL_MODEL.');
    return 1;
  }

  const parser = createCloudParser({ id: 'eval', label: kind, baseUrl, model, apiKey }, { fetchFn, timeoutMs: 30000 });
  const index = buildMatchIndex(ALL_FOODS.map((f) => ({ id: f.id, name: f.name, aliases: f.aliases })));
  const foods = new Map(ALL_FOODS.map((f) => [f.id, { unit: f.unit }]));

  log(`Provider: ${kind} (${model}) - ${SENTENCES.length} sentences`);
  const result = await evaluate(SENTENCES, (t) => parser.parse(t, { slots: DEFAULT_SLOTS }), index, foods, DEFAULT_SLOTS);
  for (const f of result.failures) {
    log(`\nMISSED: ${f.text}`);
    if (f.error) log(`  error: ${f.error}`);
    log(`  expected: ${f.expected.map((e) => `${e.qty} ${e.unit} ${e.food}`).join(', ')}`);
    if (!f.error) log(`  got:      ${f.actual.map((a) => `${a.qty} ${a.unit} ${a.food ?? '(not found)'}`).join(', ') || '(nothing)'}`);
  }
  log(`\nScore: ${result.correct} / ${result.total} (${Math.round((100 * result.correct) / result.total)}%)`);
  return 0;
}
