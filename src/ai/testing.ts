/** A minimal Response for mocked fetch calls. */
export function res(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    text: async () => text,
    json: async () => JSON.parse(text),
  } as unknown as Response;
}

/** A successful chat-completions reply whose message content is `content`. */
export const chatOk = (content: string) => res(200, { choices: [{ message: { role: 'assistant', content } }] });

export const ITEMS_JSON = '{"items":[{"name":"samosa","qty":2,"unit":"","slot":""}]}';
