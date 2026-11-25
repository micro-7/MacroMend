import type { ProviderKind } from '../db/providers';

export interface ProviderPreset {
  kind: ProviderKind;
  label: string;
  baseUrl: string;
  /** Default model. Model names change often, so this is only a starting point the user can edit. */
  model: string;
  /** Where to get a free key. */
  keyUrl: string;
  privacy: string;
}

const SENT = 'Only the text you type and the names of your meals are sent.';

export const PRESETS: Record<ProviderKind, ProviderPreset> = {
  gemini: {
    kind: 'gemini',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-3.5-flash-lite',
    keyUrl: 'https://aistudio.google.com/api-keys',
    privacy: `On the free tier, Google may use what you send to improve its products. ${SENT}`,
  },
  groq: {
    kind: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'openai/gpt-oss-20b',
    keyUrl: 'https://console.groq.com/keys',
    privacy: `Groq says it does not train on your data. ${SENT}`,
  },
  openrouter: {
    kind: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openrouter/free',
    keyUrl: 'https://openrouter.ai/keys',
    privacy: `Some free models may train on prompts, depending on who runs the model. ${SENT}`,
  },
  custom: {
    kind: 'custom',
    label: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    model: '',
    keyUrl: '',
    privacy: `${SENT} They go to the address you entered, so check how that service uses them.`,
  },
};

export const PRESET_KINDS: ProviderKind[] = ['gemini', 'groq', 'openrouter', 'custom'];
