import { z } from 'zod';
import { runProviders, type ChainDeps } from '../ai/chain';
import { extractJson } from '../ai/schema';
import { callChat } from '../ai/openaiCompat';
import type { ChatMessage } from '../ai/prompt';
import type { FoodCategory } from '../core/diet';
import { checkNutrition } from '../db/userFoods';
import { guessCategoryFromName } from './category';

/** A rough nutrition guess for a food that is nowhere else. Always shown to the user to check before saving. */
export interface FoodEstimate {
  name: string;
  kcalPer100g: number;
  proteinPer100g: number;
  unit: string;
  gramsPerUnit: number;
  category: FoodCategory;
}

const Num = z.union([z.number(), z.string().trim().regex(/^\d+(\.\d+)?$/).transform(Number)]);

const Schema = z.object({
  name: z.string().trim().min(1).max(80).nullish(),
  kcal_per_100g: Num,
  protein_per_100g: Num,
  unit: z.string().trim().min(1).max(30).nullish(),
  grams_per_unit: Num.nullish(),
  category: z.enum(['veg', 'egg', 'non-veg', 'vegan']).nullish(),
});

export function buildEstimateMessages(foodName: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You estimate nutrition for one food, typically as eaten (cooked, as served). The name may be English or Hinglish.',
        'Reply with ONLY one JSON object of this exact shape and nothing else:',
        '{"name":"","kcal_per_100g":0,"protein_per_100g":0,"unit":"","grams_per_unit":0,"category":""}',
        '- name: a simple English name for the food.',
        '- kcal_per_100g and protein_per_100g: numbers for 100 grams. Be realistic: protein x 4 can never be more than the calories.',
        '- unit: how people usually count it (piece, katori, plate, glass, scoop, slice), and grams_per_unit: the weight of one such unit in grams.',
        '- category: "veg" (vegetarian incl. dairy), "egg", "non-veg" (meat, fish) or "vegan".',
        'Example: Input: paneer butter masala\nOutput: {"name":"Paneer butter masala","kcal_per_100g":190,"protein_per_100g":8,"unit":"katori","grams_per_unit":150,"category":"veg"}',
      ].join('\n'),
    },
    { role: 'user', content: foodName.trim() },
  ];
}

export type ParsedEstimate = { ok: true; estimate: FoodEstimate } | { ok: false; reason: string };

/** Turn a model's reply into a checked estimate, or say why it cannot be used. */
export function parseEstimate(text: string, foodName: string): ParsedEstimate {
  const json = extractJson(text);
  if (json === null) return { ok: false, reason: 'No JSON found in the reply.' };
  const r = Schema.safeParse(json);
  if (!r.success) return { ok: false, reason: 'The reply does not match the expected shape.' };
  const d = r.data;
  const bad = checkNutrition(d.kcal_per_100g, d.protein_per_100g);
  if (bad) return { ok: false, reason: bad };
  const grams = d.grams_per_unit ?? 0;
  if (d.grams_per_unit != null && (grams <= 0 || grams > 2000)) return { ok: false, reason: 'The portion weight is not realistic.' };
  const name = d.name?.trim() || foodName.trim();
  return {
    ok: true,
    estimate: {
      name,
      kcalPer100g: Math.round(d.kcal_per_100g),
      proteinPer100g: Math.round(d.protein_per_100g * 10) / 10,
      unit: d.unit?.trim() && grams > 0 ? d.unit.trim().toLowerCase() : 'g',
      gramsPerUnit: d.unit?.trim() && grams > 0 ? grams : 1,
      category: d.category ?? guessCategoryFromName(name) ?? 'veg',
    },
  };
}

export type EstimateResult =
  | { ok: true; estimate: FoodEstimate; label: string }
  | { ok: false; reason: 'no_providers' | 'offline' | 'all_failed' | 'rejected'; message: string };

const MESSAGES = {
  no_providers: 'No AI is set up, so you can enter the values yourself.',
  offline: "You're offline, so the AI can't make an estimate. You can enter the values yourself.",
  all_failed: "None of your AI providers could make an estimate. You can enter the values yourself.",
  rejected: 'The AI gave numbers that cannot be right, so they were thrown away. Please enter the values yourself.',
} as const;

/**
 * Ask the user's AI providers for a rough nutrition estimate of a food. This is the one place a model supplies
 * numbers, so every reply is range-checked, and the result is always shown to the user before it is saved.
 */
export async function estimateFood(deps: ChainDeps, foodName: string): Promise<EstimateResult> {
  let rejected = false;
  const r = await runProviders<FoodEstimate>(deps, async (row, apiKey) => {
    const chat = await callChat({ id: row.id, label: row.label, baseUrl: row.baseUrl, model: row.model, apiKey }, buildEstimateMessages(foodName), deps.call);
    if (!chat.ok) return chat;
    const parsed = parseEstimate(chat.text, foodName);
    if (parsed.ok) return { ok: true, value: parsed.estimate };
    if (!parsed.reason.startsWith('No JSON') && !parsed.reason.startsWith('The reply does not')) rejected = true;
    return { ok: false, error: 'invalid_reply', message: parsed.reason };
  });
  if (r.ok) return { ok: true, estimate: r.value, label: r.label };
  const reason = r.reason === 'all_failed' && rejected ? 'rejected' : r.reason;
  return { ok: false, reason, message: MESSAGES[reason] };
}
