/** One food the AI found in the user's text. Names are English; no nutrition values are ever accepted. */
export interface ParsedItem {
  name: string;
  /** A number, or a number word exactly as written ("do", "dedh"); empty means 1. */
  qty: number | string | null;
  unit: string;
  /** One of the user's slot ids, or empty. */
  slot: string;
}

export type ParseErrorCode = 'rate_limit' | 'quota' | 'auth' | 'model' | 'invalid_reply' | 'network' | 'timeout';

export type ParseResult =
  | { ok: true; items: ParsedItem[] }
  | { ok: false; error: ParseErrorCode; retryAfterS?: number; message?: string };

export interface ParseSlot {
  id: string;
  name: string;
}

export interface ParseContext {
  slots: ParseSlot[];
}

/** Anything that can turn text into items: a cloud provider now, the phone model later. */
export interface Parser {
  id: string;
  label: string;
  parse(text: string, ctx: ParseContext): Promise<ParseResult>;
}
