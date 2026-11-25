import { z } from 'zod';
import type { ParsedItem, ParseSlot } from './types';

// Unknown keys are dropped on purpose: this is how any calories or protein a model adds are ignored.
const ItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  qty: z.union([z.number().positive().max(100000), z.string().trim().max(40)]).nullish(),
  unit: z.string().trim().max(30).nullish(),
  slot: z.string().trim().max(40).nullish(),
});

const ReplySchema = z.object({ items: z.array(ItemSchema).min(1).max(20) });

/**
 * Find the first complete JSON object in a model reply, even inside a code fence or surrounded by
 * explanation. Returns null when there is none.
 */
export function extractJson(text: string): unknown | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch {
        // Not valid JSON; try the next opening brace.
        const next = text.indexOf('{', start + 1);
        return next < 0 ? null : extractJson(text.slice(next));
      }
    }
  }
  return null;
}

export type ReplyResult = { ok: true; items: ParsedItem[] } | { ok: false; reason: string };

/** Accept a slot written as an id or as the slot's name, in any case. Empty stays empty; anything else is invalid. */
function resolveSlot(raw: string, slots: ParseSlot[]): string | null {
  if (!raw) return '';
  const key = raw.trim().toLowerCase();
  const hit = slots.find((s) => s.id.toLowerCase() === key || s.name.trim().toLowerCase() === key);
  return hit ? hit.id : null;
}

/** Turn a model's reply text into validated items, or say why it cannot be used. */
export function parseReply(text: string, slots: ParseSlot[]): ReplyResult {
  const json = extractJson(text);
  if (json === null) return { ok: false, reason: 'No JSON found in the reply.' };
  const checked = ReplySchema.safeParse(json);
  if (!checked.success) return { ok: false, reason: 'The reply does not match the expected shape.' };

  const items: ParsedItem[] = [];
  for (const it of checked.data.items) {
    const slot = resolveSlot(it.slot ?? '', slots);
    if (slot === null) return { ok: false, reason: `Unknown meal "${it.slot}".` };
    items.push({ name: it.name, qty: it.qty ?? null, unit: it.unit ?? '', slot });
  }
  return { ok: true, items };
}
