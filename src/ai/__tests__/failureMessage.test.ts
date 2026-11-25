import type { Attempt } from '../chain';
import { explainFailure } from '../failureMessage';

const attempt = (label: string, outcome: Attempt['outcome']): Attempt => ({ providerId: label, label, outcome });

describe('explainFailure', () => {
  it('says no AI is set up', () => {
    expect(explainFailure({ ok: false, reason: 'no_providers', attempts: [] })).toMatch(/No AI is set up yet/);
  });

  it('says the phone is offline', () => {
    expect(explainFailure({ ok: false, reason: 'offline', attempts: [] })).toMatch(/offline/);
  });

  it('lists why each provider failed in plain words', () => {
    const msg = explainFailure({
      ok: false,
      reason: 'all_failed',
      attempts: [attempt('Gemini', 'quota'), attempt('Groq', 'auth'), attempt('OpenRouter', 'timeout'), attempt('Old', 'skipped')],
    });
    expect(msg).toContain('Gemini: out of quota today');
    expect(msg).toContain('Groq: key rejected');
    expect(msg).toContain('OpenRouter: too slow');
    expect(msg).toContain('Old: on hold');
    expect(msg).toMatch(/Pick the food below/);
  });

  it('never mentions an API key value', () => {
    expect(explainFailure({ ok: false, reason: 'all_failed', attempts: [attempt('Groq', 'auth')] })).not.toMatch(/sk-|gsk_|AIza/);
  });
});
