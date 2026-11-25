import type { ParseSlot } from './types';

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

/** Examples shown to every model (cloud and, later, the phone model): English, Hinglish and mixed. */
export const FEW_SHOTS: { input: string; output: string }[] = [
  {
    input: 'had 2 roti and dal',
    output: '{"items":[{"name":"roti","qty":2,"unit":"","slot":""},{"name":"dal","qty":1,"unit":"","slot":""}]}',
  },
  {
    input: 'office mein 2 samosa kha liye',
    output: '{"items":[{"name":"samosa","qty":2,"unit":"","slot":""}]}',
  },
  {
    input: 'breakfast mein do anda aur ek katori dahi',
    output: '{"items":[{"name":"egg","qty":"do","unit":"","slot":"breakfast"},{"name":"curd","qty":"ek","unit":"katori","slot":"breakfast"}]}',
  },
  {
    input: '1 scoop whey after gym',
    output: '{"items":[{"name":"whey protein","qty":1,"unit":"scoop","slot":""}]}',
  },
  {
    input: 'dedh katori rajma chawal ke saath',
    output: '{"items":[{"name":"rajma","qty":"dedh","unit":"katori","slot":""},{"name":"rice","qty":1,"unit":"","slot":""}]}',
  },
  {
    input: '2 panner paratha',
    output: '{"items":[{"name":"paneer paratha","qty":2,"unit":"","slot":""}]}',
  },
  {
    input: 'ek glass nimbu pani pi li',
    output: '{"items":[{"name":"nimbu pani","qty":"ek","unit":"glass","slot":""}]}',
  },
  {
    input: 'half bowl lemon rice',
    output: '{"items":[{"name":"lemon rice","qty":"half","unit":"bowl","slot":""}]}',
  },
  {
    input: 'sawa glass lassi',
    output: '{"items":[{"name":"lassi","qty":"sawa","unit":"glass","slot":""}]}',
  },
  {
    input: 'dinner: 150 g paneer bhurji aur 2 chapati',
    output: '{"items":[{"name":"paneer bhurji","qty":150,"unit":"g","slot":"dinner"},{"name":"roti","qty":2,"unit":"","slot":"dinner"}]}',
  },
];

/** The instructions and examples sent with every request. Never mentions calories: numbers come from the food table. */
export function buildSystemPrompt(slots: ParseSlot[]): string {
  const slotList = slots.map((s) => `"${s.id}" (${s.name})`).join(', ');
  return [
    'You turn a short description of food someone ate into JSON. The text may be English, Hinglish (Hindi written in English letters) or a mix. Always reply in English JSON.',
    'Reply with ONLY one JSON object of this exact shape and nothing else: {"items":[{"name":"","qty":1,"unit":"","slot":""}]}',
    'Rules:',
    '- One item per food. Use a simple, singular English food name ("roti", "curd", "samosa", "rice"). Translate Hindi names that have a simple English word ("dahi" is "curd", "anda" is "egg", "chawal" is "rice"), but keep names of dishes and drinks that have no simple English word ("chaas", "lassi", "nimbu pani", "kadhi", "khichdi") as they are. Never turn one food into a different one.',
    '- A dish named with two foods is ONE item ("curd rice", "lemon rice", "egg curry", "paneer paratha"). Only split when the text lists separate foods ("dal aur rice", "roti and dal").',
    '- Keep the whole food name, including words that say what kind it is ("paneer paratha" stays "paneer paratha", never just "paratha"; "butter chicken" never just "chicken"). Fix obvious spelling mistakes ("panner" is "paneer") but never drop words.',
    '- qty: the amount as a number. If it is written as a number word ("do", "teen", "aadha", "dedh", "half"), copy the word exactly as written. If no amount is given, use 1.',
    '- unit: the unit as written ("katori", "g", "scoop", "glass", "bowl", "piece"), or "" if none is given. Do not invent units.',
    `- slot: one of ${slotList} if the text says which meal it was, otherwise "".`,
    '- Do not include calories, protein or any other nutrition values. Do not add foods that were not mentioned.',
    'Examples:',
    ...FEW_SHOTS.map((e) => `Input: ${e.input}\nOutput: ${e.output}`),
  ].join('\n');
}

export function buildMessages(text: string, slots: ParseSlot[]): ChatMessage[] {
  return [
    { role: 'system', content: buildSystemPrompt(slots) },
    { role: 'user', content: text.trim() },
  ];
}
