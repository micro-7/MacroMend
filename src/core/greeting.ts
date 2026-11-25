/** "Good morning" before 12:00, "Good afternoon" before 17:00 and "Good evening" after, plus the name when there is one. */
export function greeting(now: Date, name?: string | null): string {
  const h = now.getHours();
  const base = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const n = name?.trim();
  return n ? `${base}, ${n}` : base;
}
