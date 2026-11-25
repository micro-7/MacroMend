import type { Attempt, ChainResult } from './chain';

/** The message to show when the AI could not be used, in plain words. */
export function explainFailure(r: Extract<ChainResult, { ok: false }>): string {
  if (r.reason === 'no_providers') return 'No AI is set up yet. Add a free key in Settings to log by typing, or pick the food below.';
  if (r.reason === 'offline') return "You're offline, so the AI can't be used. Pick the food below, or try again when you're connected.";
  const why = (a: Attempt) =>
    a.outcome === 'skipped' ? 'on hold' : a.outcome === 'no_key' ? 'no key saved' : a.outcome === 'rate_limit' ? 'rate limited'
      : a.outcome === 'quota' ? 'out of quota today' : a.outcome === 'auth' ? 'key rejected' : a.outcome === 'timeout' ? 'too slow'
      : a.outcome === 'model' ? 'model not found' : a.outcome === 'invalid_reply' ? 'unusable reply' : 'no connection';
  return `None of your AI providers could read that (${r.attempts.map((a) => `${a.label}: ${why(a)}`).join('; ')}). Pick the food below, or check Settings → AI providers.`;
}
